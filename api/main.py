"""Sensory Audit API - Makes physical spaces autism-friendly.

Takes video/audio/text of a space → analyzes sensory load per second
→ flags overwhelming moments → generates accessibility suggestions.

Powered by TRIBE v2 brain encoding model + ABIDE-trained neurodiverse transform.
"""

# Force CPU before anything imports torch
import os
os.environ["CUDA_VISIBLE_DEVICES"] = ""

import torch
# Patch torch.cuda so any .to("cuda") silently goes to CPU
_original_to = torch.Tensor.to
def _safe_to(self, *args, **kwargs):
    if args and isinstance(args[0], (str, torch.device)):
        dev = str(args[0])
        if "cuda" in dev:
            args = ("cpu",) + args[1:]
    if "device" in kwargs and "cuda" in str(kwargs["device"]):
        kwargs["device"] = "cpu"
    return _original_to(self, *args, **kwargs)
torch.Tensor.to = _safe_to
torch.cuda.is_available = lambda: False

import io
import base64
import json
import logging
from pathlib import Path

import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Sensory Audit API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None
_nd_transform = None


def get_model():
    global _model
    if _model is None:
        import torch
        from tribev2 import TribeModel
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Loading TRIBE v2 on {device}...")
        config_update = {
            "data.text_feature.device": "cpu",
            "data.audio_feature.device": "cpu",
            "data.num_workers": 0,
        }
        _model = TribeModel.from_pretrained(
            "facebook/tribev2", cache_folder="./cache",
            device=device, config_update=config_update,
        )
        logger.info("TRIBE v2 loaded")
    return _model


def get_nd_transform():
    """Load ND transform. Tries v4 (FDR-corrected) first, falls back to v3."""
    global _nd_transform
    if _nd_transform is None:
        import torch
        from huggingface_hub import hf_hub_download
        try:
            path = hf_hub_download("Ibrahim9989/neurobrain-nd-transform", "neurodiverse_transform_v4.pt")
            _nd_transform = torch.load(path, map_location="cpu", weights_only=False)
            logger.info("ND transform v4 loaded (FDR-corrected, %d ASD, %d TD)", _nd_transform["n_asd"], _nd_transform["n_td"])
        except Exception:
            path = hf_hub_download("Ibrahim9989/neurobrain-nd-transform", "neurodiverse_transform_v3.pt")
            _nd_transform = torch.load(path, map_location="cpu", weights_only=True)
            logger.info("ND transform v3 loaded (uncorrected, %d ASD, %d TD)", _nd_transform["n_asd"], _nd_transform["n_td"])
    return _nd_transform


def extract_frame(video_path, time_sec):
    """Extract a single frame from video as base64 PNG."""
    try:
        from moviepy import VideoFileClip
        clip = VideoFileClip(video_path)
        frame = clip.get_frame(min(time_sec, clip.duration - 0.1))
        clip.close()

        from PIL import Image
        img = Image.fromarray(frame)
        img.thumbnail((320, 180))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=70)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")
    except:
        return None


def brain_to_image(preds, timestep=0):
    """Render brain prediction as base64 PNG."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from nilearn import datasets, plotting

    fsaverage = datasets.fetch_surf_fsaverage("fsaverage5")
    data = preds[timestep] if preds.ndim == 2 else preds

    abs_data = np.abs(data)
    vmax = np.percentile(abs_data, 98)
    threshold = np.percentile(abs_data, 60)

    fig, axes = plt.subplots(1, 2, figsize=(10, 4), subplot_kw={"projection": "3d"})
    for ax, hemi in zip(axes, ["left", "right"]):
        n = len(data) // 2
        hemi_data = data[:n] if hemi == "left" else data[n:]
        mesh = fsaverage[f"pial_{hemi}"]
        bg = fsaverage[f"sulc_{hemi}"]
        plotting.plot_surf_stat_map(
            mesh, hemi_data, hemi=hemi, view="lateral",
            bg_map=bg, colorbar=False, threshold=threshold,
            vmax=vmax, cmap="cold_hot", symmetric_cbar=True, axes=ax,
        )
    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=100, bbox_inches="tight", facecolor="black")
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def get_gpt_suggestions(summary, flagged):
    """Generate suggestions using Azure OpenAI."""
    try:
        from openai import AzureOpenAI
        client = AzureOpenAI(
            azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
            api_key=os.environ["AZURE_OPENAI_API_KEY"],
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2025-04-01-preview"),
        )
        dominant = summary.get("dominant_stressors", {})
        prompt = f"""You are an autism accessibility consultant analyzing a sensory audit of a physical space.

Audit results:
- Duration: {summary['duration_seconds']}s
- Accessibility Score: {summary['accessibility_score']:.0%}
- Average stress: {summary['average_stress']:.1%}
- Peak stress: {summary['peak_stress']:.1%}
- High-stress moments: {summary['high_stress_moments']}
- Dominant stressors: {dominant}

Flagged moments:
{chr(10).join([f"- t={f['time']}s: {f['level']} stress ({f['dominant_channel']})" for f in flagged[:10]])}

Generate exactly 6 specific, actionable suggestions. For each:
1. title (5 words max)
2. issue (what's wrong)
3. action (what to do)
4. impact (expected result)
5. priority (high/medium/low)

Return ONLY a JSON array: [{{"title":"...","issue":"...","action":"...","impact":"...","priority":"..."}}]"""

        response = client.chat.completions.create(
            model=os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-5.2-chat"),
            messages=[
                {"role": "system", "content": "You are an autism accessibility expert. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            max_completion_tokens=600,
        )
        text = response.choices[0].message.content.strip()
        if "```" in text:
            text = text.split("```")[1].replace("json", "").strip()
        return json.loads(text)
    except Exception as e:
        logger.warning(f"GPT failed: {e}")
        return _default_suggestions()


def _default_suggestions():
    return [
        {"title": "Reduce noise levels", "issue": "Auditory overload detected", "action": "Add sound-absorbing panels or provide noise-canceling headphones at entry", "impact": "Reduces auditory overwhelm by ~40%", "priority": "high"},
        {"title": "Soften the lighting", "issue": "Bright or flickering lights", "action": "Replace fluorescent lights with warm, dimmable LEDs. No exposed bulbs.", "impact": "Reduces visual stress triggers", "priority": "high"},
        {"title": "Create a quiet zone", "issue": "No escape from sensory input", "action": "Designate a low-stimulation room with soft lighting, bean bags, minimal decor", "impact": "Recovery space when overwhelmed", "priority": "high"},
        {"title": "Simplify visual environment", "issue": "Too much visual clutter", "action": "Reduce signage, use neutral colors, clear pathways, organized shelves", "impact": "Reduces cognitive load", "priority": "medium"},
        {"title": "Add transition warnings", "issue": "Sudden changes cause distress", "action": "Use visual timers, 5-minute warnings before activity changes, clear schedules", "impact": "Prepares brain for transitions", "priority": "medium"},
        {"title": "Control crowd density", "issue": "Too many people at once", "action": "Offer quiet hours, stagger entry times, or capacity limits", "impact": "Reduces social + sensory overwhelm", "priority": "low"},
    ]


@app.get("/")
async def root():
    return {"status": "ok", "service": "Sensory Audit API v1.0"}


@app.post("/api/audit/video")
async def audit_video(file: UploadFile = File(...)):
    """Full sensory audit from video upload."""
    try:
        model = get_model()
        transform = get_nd_transform()
        scale = transform["vertex_scale"].numpy()
        shift = transform["vertex_shift"].numpy()

        os.makedirs("./tmp", exist_ok=True)
        video_path = f"./tmp/{file.filename}"
        with open(video_path, "wb") as f:
            f.write(await file.read())

        from moviepy import VideoFileClip
        clip = VideoFileClip(video_path)
        duration = clip.duration
        clip.close()

        # Video + Audio only -- no text transcription needed for sensory audit
        from tribev2.demo_utils import get_audio_and_text_events
        import pandas as pd

        # Trim video to max 15 seconds and reduce frame rate for faster processing
        from moviepy import VideoFileClip as VFC2
        trimmed_path = "./tmp/audit_trimmed.mp4"
        c = VFC2(video_path)
        max_dur = min(c.duration, 15)
        c.subclipped(0, max_dur).write_videofile(trimmed_path, fps=2, audio=True, logger=None)
        c.close()
        logger.info(f"Trimmed video: {max_dur:.1f}s at 2fps")

        video_event = {
            "type": "Video",
            "filepath": trimmed_path,
            "start": 0,
            "timeline": "default",
            "subject": "default",
        }
        events = get_audio_and_text_events(pd.DataFrame([video_event]), audio_only=True)

        nt_preds, segments = model.predict(events, verbose=False)
        nd_preds = nt_preds * scale + shift

        return _build_audit_response(nt_preds, nd_preds, duration, video_path)

    except Exception as e:
        logger.error(f"Video audit failed: {e}", exc_info=True)
        raise HTTPException(500, str(e))


@app.post("/api/audit/text")
async def audit_text(text: str = Form(...)):
    """Sensory audit from text description of a space."""
    try:
        model = get_model()
        transform = get_nd_transform()
        scale = transform["vertex_scale"].numpy()
        shift = transform["vertex_shift"].numpy()

        os.makedirs("./tmp", exist_ok=True)
        with open("./tmp/audit_text.txt", "w") as f:
            f.write(text)

        # Pad short text to avoid word-matching issues
        padded = text.strip()
        if len(padded.split()) < 20:
            padded = padded + ". " + padded

        with open("./tmp/audit_text.txt", "w") as f2:
            f2.write(padded)

        try:
            events = model.get_events_dataframe(text_path="./tmp/audit_text.txt")
        except Exception as word_err:
            logger.warning(f"Text pipeline failed ({word_err}), retrying with simpler text")
            # Simplify: just use TTS audio without word matching
            from tribev2.demo_utils import get_audio_and_text_events
            from gtts import gTTS
            import pandas as pd
            audio_path = "./tmp/audit_audio.mp3"
            tts = gTTS(padded, lang="en")
            tts.save(audio_path)
            audio_event = {"type": "Audio", "filepath": audio_path, "start": 0, "timeline": "default", "subject": "default"}
            events = get_audio_and_text_events(pd.DataFrame([audio_event]), audio_only=True)

        nt_preds, segments = model.predict(events, verbose=False)
        nd_preds = nt_preds * scale + shift

        return _build_audit_response(nt_preds, nd_preds, len(text) / 15.0, None, text)

    except Exception as e:
        logger.error(f"Text audit failed: {e}", exc_info=True)
        raise HTTPException(500, str(e))


def _build_audit_response(nt_preds, nd_preds, duration, video_path=None, text=None):
    """Build the audit response from NT and ND predictions."""
    timeline = []
    flagged = []

    for t in range(nt_preds.shape[0]):
        nt_act = float(np.mean(np.abs(nt_preds[t])))
        nd_act = float(np.mean(np.abs(nd_preds[t])))
        div = float(np.mean((nt_preds[t] - nd_preds[t]) ** 2))

        stress = min((nd_act * 0.6 + div * 100 * 0.4) / 0.15, 1.0)

        # Channel-specific stress (approximate by vertex region)
        n = len(nd_preds[t]) // 2
        visual = float(np.mean(np.abs(nd_preds[t][int(n*0.7):n])))  # posterior
        auditory = float(np.mean(np.abs(nd_preds[t][int(n*0.3):int(n*0.5)])))  # temporal
        social = float(np.mean(np.abs(nd_preds[t][int(n*0.5):int(n*0.7)])))  # parietal

        entry = {
            "time": t,
            "stress": round(stress, 3),
            "visual": round(visual, 4),
            "auditory": round(auditory, 4),
            "social": round(social, 4),
        }
        timeline.append(entry)

        if stress > 0.5:
            level = "high" if stress > 0.75 else "moderate"
            dominant = max([("visual", visual), ("auditory", auditory), ("social", social)], key=lambda x: x[1])[0]

            flag = {
                "time": t,
                "level": level,
                "stress": round(stress, 3),
                "dominant_channel": dominant,
                "brain_image": brain_to_image(nd_preds, t),
            }
            if video_path:
                frame = extract_frame(video_path, t)
                if frame:
                    flag["video_frame"] = frame
            flagged.append(flag)

    scores = [e["stress"] for e in timeline]
    accessibility = round(1.0 - np.mean(scores), 2)

    # Count dominant stressors
    stressor_counts = {}
    for f in flagged:
        ch = f["dominant_channel"]
        stressor_counts[ch] = stressor_counts.get(ch, 0) + 1

    summary = {
        "duration_seconds": round(duration, 1),
        "timesteps": len(timeline),
        "accessibility_score": accessibility,
        "average_stress": round(float(np.mean(scores)), 3),
        "peak_stress": round(float(np.max(scores)), 3),
        "high_stress_moments": len([f for f in flagged if f["level"] == "high"]),
        "moderate_stress_moments": len([f for f in flagged if f["level"] == "moderate"]),
        "dominant_stressors": stressor_counts,
    }

    suggestions = get_gpt_suggestions(summary, flagged)

    return {
        "summary": summary,
        "timeline": timeline,
        "flagged_moments": flagged[:15],
        "suggestions": suggestions,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
