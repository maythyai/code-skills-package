---
name: video-editing
description: AI-assisted video editing workflows for cutting, structuring, and augmenting real footage. Covers the full pipeline from raw capture through FFmpeg, Remotion, ElevenLabs, fal.ai, and final polish in Descript or CapCut. Use when the user wants to edit video, cut footage, create vlogs, or build video content.
layer: 4
category: patterns
----------|-------------|------------|
| YouTube | 16:9 | 1920x1080 |
| TikTok / Reels | 9:16 | 1080x1920 |
| Instagram Feed | 1:1 | 1080x1080 |
| X / Twitter | 16:9 or 1:1 | 1280x720 or 720x720 |

### Reframe with FFmpeg

```bash
# 16:9 to 9:16 (center crop)
ffmpeg -i input.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920" vertical.mp4

# 16:9 to 1:1 (center crop)
ffmpeg -i input.mp4 -vf "crop=ih:ih,scale=1080:1080" square.mp4
```

### Reframe with VideoDB

```python
# Smart reframe (AI-guided subject tracking)
reframed = video.reframe(start=0, end=60, target="vertical", mode=ReframeMode.smart)
```

## Scene Detection and Auto-Cut

### FFmpeg scene detection

```bash
# Detect scene changes (threshold 0.3 = moderate sensitivity)
ffmpeg -i input.mp4 -vf "select='gt(scene,0.3)',showinfo" -vsync vfr -f null - 2>&1 | grep showinfo
```

### Silence detection for auto-cut

```bash
# Find silent segments (useful for cutting dead air)
ffmpeg -i input.mp4 -af silencedetect=noise=-30dB:d=2 -f null - 2>&1 | grep silence
```

### Highlight extraction

Use Claude to analyze transcript + scene timestamps:
```
"Given this transcript with timestamps and these scene change points,
identify the 5 most engaging 30-second clips for social media."
```

## What Each Tool Does Best

| Tool | Strength | Weakness |
|------|----------|----------|
| Claude / Codex | Organization, planning, code generation | Not the creative taste layer |
| FFmpeg | Deterministic cuts, batch processing, format conversion | No visual editing UI |
| Remotion | Programmable overlays, composable scenes, reusable templates | Learning curve for non-devs |
| Screen Studio | Polished screen recordings immediately | Only screen capture |
| ElevenLabs | Voice, narration, music, SFX | Not the center of the workflow |
| Descript / CapCut | Final pacing, captions, polish | Manual, not automatable |

## Key Principles

1. **Edit, don't generate.** This workflow is for cutting real footage, not creating from prompts.
2. **Structure before style.** Get the story right in Layer 2 before touching anything visual.
3. **FFmpeg is the backbone.** Boring but critical. Where long footage becomes manageable.
4. **Remotion for repeatability.** If you'll do it more than once, make it a Remotion component.
5. **Generate selectively.** Only use AI generation for assets that don't exist, not for everything.
6. **Taste is the last layer.** AI clears repetitive work. You make the final creative calls.

## Related Skills

- `fal-ai-media` — AI image, video, and audio generation
- `videodb` — Server-side video processing, indexing, and streaming
- `content-engine` — Platform-native content distribution
