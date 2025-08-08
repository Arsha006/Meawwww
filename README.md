# 🦜 Nature's Roast - Animal Sound Web App

A fun web application that records your animal impressions and roasts you with random animal responses!

## Features

- **🎙️ Voice Recording**: Record your animal sounds using your laptop microphone
- **🎲 Random Animal Selection**: Get roasted by a completely different random animal
- **🖼️ Animal Images**: Beautiful high-quality images of the roasting animals
- **😄 Funny Responses**: Sarcastic and humorous roasts from the animals
- **🔊 Audio Playback**: Your recorded audio plays in the background (looped)
- **🎵 Animal Sound Effects**: Optional animal sound effects for extra chaos
- **🎛️ Audio Controls**: Mute/unmute and stop audio playback

## How to Use

1. **Allow Microphone Access**: When prompted, allow the browser to access your microphone
2. **Click "Start Roasting"**: Begin recording your animal impression
3. **Make Your Sound**: Imitate any animal sound you want
4. **Click "Stop"**: End the recording when you're done
5. **Enjoy the Roast**: See which random animal roasts you and hear your recording loop in the background
6. **Try Again**: Click "Try another" to record a new impression

## Audio Controls

- **🔊/🔇 Mute Button**: Toggle audio on/off
- **⏹️ Stop Button**: Stop all audio playback
- **Copy Line**: Copy the roast text to your clipboard

## Technical Details

- **Frontend Only**: Pure HTML, CSS, and JavaScript
- **MediaRecorder API**: Captures microphone input
- **HTMLAudioElement**: Plays recorded audio in background
- **No Backend Required**: Everything runs in the browser

## Browser Compatibility

Works best in modern browsers that support:
- MediaRecorder API
- getUserMedia API
- AudioContext API

## Note on Animal Sounds

The current version uses placeholder sound URLs. To add real animal sounds, replace the `sound` URLs in the `animals` array in `script.js` with actual animal sound files.

## Privacy

- All audio recording happens locally in your browser
- No audio is sent to any server
- Your recordings are only stored temporarily in memory

---

Made for laughs. No animals were harmed 🫶
