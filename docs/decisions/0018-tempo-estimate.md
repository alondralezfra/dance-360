# 0018. Estimating a song's tempo and first beat

- Status: Accepted
- Date: 2026-11-09
- Extends [0017](0017-song-tab-and-audio-storage.md). Plan §3.2 listed beat detection as a later feature; the project owner asked for the tempo part now.

## Context
Typing a song's BPM by hand (and then finding where the first beat lands) is too much work for directors. The song is already decoded when it is attached, so an estimate costs little.

## Decisions (made with the project owner)
- **Fill it in if the tempo is still the default** (120 BPM, start 0); once the person has set their own tempo it is **never overwritten**: the estimate is shown as a suggestion with a one-click *Use this tempo*. Attaching the song and filling in the tempo are **one store update**, so one Undo takes back both.
- **Estimate both** the BPM and the **start point** (the first strong beat), because a correct BPM with the beats starting at the wrong moment still leaves counts between beats. The nudge buttons stay: the first beat is not always count 1 of Set 1.
- **Always correctable and re-askable:** *Half* and *Double* buttons beside BPM, and *Estimate from song* to work it out again on request (this one replaces whatever is set, because the person asked).
- **Says so when it can't tell:** music with no steady beat (or too short) reports "Could not tell the tempo from this song" and changes nothing.

## How it works (`model/tempoEstimate.ts`, pure; decoding stays in `audio/`)
1. **Onset curve** (`onsetStrength`): short-time spectrum (new `model/fft.ts`), the *increase* in each frame's log-spectrum, in three bands (30-250 Hz, 250-2000 Hz, 2000-4000 Hz) that are each scaled to the same average and weighted 1 : 0.6 : 0.3, minus a half-second moving average. Banding was needed because a busy hi-hat changes the whole spectrum more than a kick does and was taking over the beat; a band with almost no onsets is kept silent so a held note's numerical dust is not scaled up into fake beats.
2. **Coarse search:** autocorrelation of the (slightly blurred) curve at one to four beats, over 60-200 BPM in 0.25 steps, weighted towards 120 BPM (a log-normal prior, 0.7 octaves wide). The blur matters: at fast tempos a beat is a fractional number of 10 ms steps and sharp spikes alternate on and between steps, which made 160 BPM look like 80.
3. **Fine search:** around the coarse answer, every 0.05 BPM and every half-step position of the beat grid, the grid whose beats land on the strongest onsets wins. This gives the tempo to a fraction of a BPM (0.2 BPM would drift nearly a beat over four minutes) and the first beat; the first beat reported is the first one that actually has a sound on it (quiet intros are skipped). Beats are reported where heard: the onset curve stamps them a steady 12.5 ms early on test tracks, corrected by a named constant.
4. **Confidence** (0 to 1) is how far the best grid stands above the typical grid position at that tempo, times how many beats really carry a sound (so one loud moment is not a beat). Clear beats score 0.9 and up; noise and held tones stay under 0.3; the cut-off is `MIN_CONFIDENCE` = 0.45.

**No library.** We already have the decoded samples; a small tested pure function is easier to keep correct than a dependency, and nothing leaves the device. (Libraries considered: web-audio-beat-detector, essentia.js, music-tempo.)

## Measured (made-up beat tracks with a known answer, `src/test/syntheticAudio.ts`)
- 90 to 160 BPM within 0.25 BPM, including 127.5, with jitter of 20 ms per beat, with noise, and from the kick alone; the first beat within 20 ms; a four-minute song stays within 0.15 s of drift; a four-minute song takes about 3 s from attaching to the field filling in in the real browser.
- **Known limits, kept honest:** slow songs (60 to 80 BPM) usually come out doubled, and very fast ones (170+) can come out at half or at 2/3 of the true tempo (Half and Double cover the octave cases, not 2/3); a sound at the very first instant cannot be seen "starting", so a first beat at exactly 0 is reported a beat later; the estimate assumes a steady tempo (the data model has room for tempo changes, `tempo.changes`, but nothing reads them yet).
- **Not verified:** real recorded music. The sandbox has none, so accuracy on real songs (live drift, swing, vocals-only intros, soft kicks) is untested. The confidence cut-off and the 120 BPM lean were chosen on synthetic data and may need adjusting after trying real songs.

## Consequences
- The estimate adds roughly a second or two to attaching a long song (computed while the song is already decoded; it is skipped when only the waveform is rebuilt).
- Nothing about the estimate is saved except the tempo it set (the note about it is shown once, not remembered): the project stores a tempo like any other.
- Playback with a metronome (a later slice) will make checking an estimate by ear easy; until then it is checked against the waveform and grid on the timeline.
