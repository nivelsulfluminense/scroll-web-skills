#!/usr/bin/env bash
# 10K media pipeline: turn approved clips into scroll-ready assets.
#
#   process-media.sh frames <out_dir> <clip> [clip ...]   numbered WebP sequence + manifest.json
#   process-media.sh video  <out.mp4> <clip> [clip ...]   scrub-ready MP4 (dense GOP, no B-frames, no audio)
#   process-media.sh poster <clip> <out.webp> [first|last] still for the static fallback (default: last)
#   process-media.sh seams  <clip> <clip> [clip ...]      scores each join; exits 1 on a visible jump
#   process-media.sh demo   <out_dir>                     synthetic test film (no generation, no cost)
#
# Environment overrides (all optional):
#   TK_WIDTH   frames: 1600 desktop / 900 when TK_PRESET=mobile;   video: 1920 / 1080
#   TK_FPS     default: source fps clamped to 12..30 (18 is a mobile *starting point*, not a rule)
#   TK_QUALITY WebP quality, default 78 desktop / 72 mobile
#   TK_GOP     video keyframe interval, default 8 desktop / 4 mobile
#   TK_CRF     video quality, default 20 desktop / 24 mobile (raise to 22-23 for grain, smoke, water)
#   TK_PRESET  desktop | mobile
#   TK_FFMPEG  path to a full ffmpeg build
#
# Never run this on raw masters inside the deployed folder: masters live in media/masters/,
# outputs go to public/ (or site/). See references/03-media.md.
set -euo pipefail

die() { echo "process-media: $*" >&2; exit 1; }

pick_ffmpeg() {
  # Stripped ffmpeg builds (bundled with some toolchains) lack scale/fps and fail with
  # misleading syntax errors. A full build lists well over 200 filters.
  local cand
  for cand in "${TK_FFMPEG:-}" "$(command -v ffmpeg 2>/dev/null || true)" /opt/homebrew/bin/ffmpeg /usr/local/bin/ffmpeg /usr/bin/ffmpeg; do
    [ -n "$cand" ] && [ -x "$cand" ] || continue
    if [ "$("$cand" -hide_banner -filters 2>/dev/null | wc -l)" -gt 200 ]; then echo "$cand"; return 0; fi
  done
  die "no full ffmpeg build found (set TK_FFMPEG)"
}
FFMPEG="$(pick_ffmpeg)"
FFPROBE="${TK_FFPROBE:-$(command -v ffprobe || true)}"
[ -x "$FFPROBE" ] || die "ffprobe not found"
# Capture first: `ffmpeg | grep -q` under pipefail reports SIGPIPE as failure and fakes a missing encoder.
ENCODERS="$("$FFMPEG" -hide_banner -encoders 2>/dev/null || true)"
case "$ENCODERS" in *libwebp*) ;; *) WEBP_MISSING=1 ;; esac
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# PNG directory -> WebP directory. Uses ffmpeg's libwebp when present, else sharp (scripts/to-webp.mjs).
encode_webp_dir() {
  local src=$1 dst=$2 q=$3 f
  mkdir -p "$dst"
  if [ -z "${WEBP_MISSING:-}" ]; then
    for f in "$src"/*.png; do
      "$FFMPEG" -hide_banner -loglevel error -y -i "$f" -c:v libwebp -quality "$q" -compression_level 6 "$dst/$(basename "${f%.png}").webp"
    done
  else
    node "$HERE/to-webp.mjs" "$src" "$dst" "$q" >/dev/null || die "no WebP encoder (install sharp or a libwebp ffmpeg)"
  fi
}

PRESET="${TK_PRESET:-desktop}"
case "$PRESET" in
  desktop) D_WIDTH=1600; V_WIDTH=1920; QUALITY=78; GOP=8; CRF=20 ;;
  mobile)  D_WIDTH=900;  V_WIDTH=1080; QUALITY=72; GOP=4; CRF=24 ;;
  *) die "TK_PRESET must be desktop or mobile" ;;
esac
QUALITY="${TK_QUALITY:-$QUALITY}"; GOP="${TK_GOP:-$GOP}"; CRF="${TK_CRF:-$CRF}"

probe_fps() {
  local r; r="$("$FFPROBE" -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of csv=p=0 "$1")"
  awk -v r="$r" 'BEGIN { split(r, a, "/"); f = (a[2] > 0) ? a[1] / a[2] : a[1]; if (f < 12) f = 12; if (f > 30) f = 30; printf "%d", f + 0.5 }'
}

# Concatenates clips; every later clip drops its first frame, which duplicates the previous
# clip's last frame when legs were generated end-frame -> start-frame.
concat_filter() {
  local n=$1 fps=$2 scale=$3 i chain="" inputs=""
  for ((i = 0; i < n; i++)); do
    if (( i == 0 )); then chain+="[$i:v]fps=$fps,$scale,setsar=1,format=yuv420p[v$i];"
    else chain+="[$i:v]fps=$fps,$scale,setsar=1,format=yuv420p,trim=start_frame=1,setpts=PTS-STARTPTS[v$i];"; fi
    inputs+="[v$i]"
  done
  echo "${chain}${inputs}concat=n=$n:v=1:a=0[out]"
}

cmd="${1:-}"; shift || true
case "$cmd" in
  frames)
    out="${1:?out_dir}"; shift; (( $# >= 1 )) || die "frames needs at least one clip"
    width="${TK_WIDTH:-$D_WIDTH}"; fps="${TK_FPS:-$(probe_fps "$1")}"
    mkdir -p "$out"; rm -f "$out"/frame-*.webp
    png="$(mktemp -d)"; trap 'rm -rf "$png"' EXIT
    args=(); for c in "$@"; do args+=(-i "$c"); done
    "$FFMPEG" -hide_banner -loglevel error -y "${args[@]}" \
      -filter_complex "$(concat_filter $# "$fps" "scale=$width:-2:flags=lanczos")" -map "[out]" \
      -start_number 0 "$png/frame-%04d.png"
    dims=$("$FFPROBE" -v error -show_entries stream=width,height -of csv=p=0:s=x "$png/frame-0000.png")
    encode_webp_dir "$png" "$out" "$QUALITY"
    count=$(find "$out" -maxdepth 1 -name 'frame-*.webp' | wc -l | tr -d ' ')
    bytes=$(du -cb "$out"/frame-*.webp | tail -1 | cut -f1)
    printf '{\n  "version": 1,\n  "count": %d,\n  "width": %d,\n  "height": %d,\n  "fps": %d,\n  "pattern": "frame-%%04d.webp",\n  "start": 0,\n  "bytes": %d\n}\n' \
      "$count" "${dims%x*}" "${dims#*x}" "$fps" "$bytes" > "$out/manifest.json"
    echo "frames: $count at ${dims} ${fps}fps, $((bytes / 1024)) KiB total, $((bytes / count / 1024)) KiB/frame -> $out"
    (( count <= 300 )) || echo "warning: $count frames. Above ~300, consider 'video' mode (references/03-media.md)." >&2
    ;;
  video)
    out="${1:?out.mp4}"; shift; (( $# >= 1 )) || die "video needs at least one clip"
    width="${TK_WIDTH:-$V_WIDTH}"; fps="${TK_FPS:-$(probe_fps "$1")}"
    args=(); for c in "$@"; do args+=(-i "$c"); done
    mkdir -p "$(dirname "$out")"
    "$FFMPEG" -hide_banner -loglevel error -y "${args[@]}" \
      -filter_complex "$(concat_filter $# "$fps" "scale=$width:-2:flags=lanczos")" -map "[out]" \
      -an -c:v libx264 -preset slow -crf "$CRF" -g "$GOP" -keyint_min "$GOP" -sc_threshold 0 -bf 0 \
      -pix_fmt yuv420p -movflags +faststart "$out"
    echo "video: $(du -h "$out" | cut -f1) gop=$GOP crf=$CRF -> $out"
    ;;
  poster)
    in="${1:?clip}"; out="${2:?out.webp}"; at="${3:-last}"
    pdir="$(mktemp -d)"; trap 'rm -rf "$pdir"' EXIT
    if [ "$at" = "last" ]; then
      "$FFMPEG" -hide_banner -loglevel error -y -sseof -0.5 -i "$in" -update 1 "$pdir/frame-0000.png"
    else
      "$FFMPEG" -hide_banner -loglevel error -y -i "$in" -frames:v 1 "$pdir/frame-0000.png"
    fi
    encode_webp_dir "$pdir" "$pdir/out" 82
    mkdir -p "$(dirname "$out")"; mv "$pdir/out/frame-0000.webp" "$out"
    echo "poster ($at) -> $out"
    ;;
  seams)
    (( $# >= 2 )) || die "seams needs at least two clips"
    tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
    worst_fail=0; prev=""
    for c in "$@"; do
      if [ -n "$prev" ]; then
        "$FFMPEG" -hide_banner -loglevel error -y -sseof -0.5 -i "$prev" -update 1 -vf scale=640:-2 "$tmp/a.png"
        "$FFMPEG" -hide_banner -loglevel error -y -i "$c" -frames:v 1 -vf scale=640:-2 "$tmp/b.png"
        ssim=$("$FFMPEG" -hide_banner -i "$tmp/a.png" -i "$tmp/b.png" -lavfi "[0:v][1:v]scale2ref[a][b];[a][b]ssim" -f null - 2>&1 \
          | sed -n 's/.*All:\([0-9.]*\).*/\1/p' | tail -1)
        verdict=$(awk -v s="$ssim" 'BEGIN { if (s >= 0.92) print "invisible"; else if (s >= 0.80) print "check by eye"; else print "VISIBLE JUMP" }')
        echo "$(basename "$prev") -> $(basename "$c"): SSIM ${ssim:-?} ($verdict)"
        [ "$verdict" != "VISIBLE JUMP" ] || worst_fail=1
      fi
      prev="$c"
    done
    echo "Thresholds are a starting calibration (0.92 / 0.80). Confirm every join by eye at full speed and frame by frame."
    exit "$worst_fail"
    ;;
  demo)
    out="${1:?out_dir}"
    tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
    # Two synthetic "legs" whose join matches, so the whole pipeline can be exercised offline.
    "$FFMPEG" -hide_banner -loglevel error -y -f lavfi -i "testsrc2=size=1280x720:rate=24:duration=3" -c:v libx264 -pix_fmt yuv420p "$tmp/leg1.mp4"
    "$FFMPEG" -hide_banner -loglevel error -y -sseof -0.05 -i "$tmp/leg1.mp4" -update 1 "$tmp/last.png"
    "$FFMPEG" -hide_banner -loglevel error -y -loop 1 -i "$tmp/last.png" -f lavfi -i "testsrc2=size=1280x720:rate=24:duration=2" \
      -filter_complex "[1:v]format=yuv420p[t];[0:v]format=yuv420p,trim=duration=2[s];[s][t]blend=all_expr='A*(1-T/2)+B*(T/2)'" \
      -r 24 -c:v libx264 -pix_fmt yuv420p "$tmp/leg2.mp4"
    TK_FPS=24 "$0" frames "$out/lg" "$tmp/leg1.mp4" "$tmp/leg2.mp4"
    TK_PRESET=mobile TK_FPS=24 "$0" frames "$out/sm" "$tmp/leg1.mp4" "$tmp/leg2.mp4"
    "$0" poster "$tmp/leg2.mp4" "$out/poster.webp" last
    "$0" seams "$tmp/leg1.mp4" "$tmp/leg2.mp4" || true
    ;;
  *)
    sed -n '2,20p' "$0"; exit 2 ;;
esac
