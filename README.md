# Streamdiscord

Streamdiscord is a Discord bot that allows users to play various types of video streams in a voice channel, including local videos, YouTube videos, and Twitch streams. This bot supports playback control like skipping, pausing, resuming, and looping, and it also includes a queue to manage multiple video requests.
Designed like a genius-level cinematic assistant.


## Features

- Play local videos from a specified folder (`videos/`).
- Stream YouTube videos directly into a voice channel.
- Stream Twitch live broadcasts.
- Control video playback (pause, resume, skip, loop).
- Queue management (add, remove, clear).
- Supports video streaming in various formats (MP4, MKV, etc.).
- Customizable bot commands with a configuration file.

## Prerequisites

Before you run the bot, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or higher)
- [FFmpeg](https://ffmpeg.org/download.html) (for video processing)
- [Streamlink](https://streamlink.github.io/) (for Twitch streaming)

## Installation

1. Clone the repository or download the project files.
2. Navigate to the project directory and install the required dependencies:

```bash
npm install
```
## Config
Create a config.json file in the root directory. It should look like this:
```json
{
    "token": "Token",
    "prefix": "$"
}
```

- Replace YOUR_DISCORD_BOT_TOKEN with your Discord bot token.

- Add any Discord user IDs you want to whitelist for controlling the bot under whitelistedAuthors.

- Ensure the videos/ directory exists in the root folder for local video files.
## Usage 
**Play Videos**
- !play local <filename> - Play a local video from the videos/ folder.

- !play yt <YouTube URL> - Play a video from YouTube.

- !play url <direct video URL> - Play a video from a direct URL.

- !play twitch <Twitch URL> - Play a live Twitch stream.

**Manage Videos**
- !videos - List available local videos.

- !queue - Show the current queue of videos.

- !remove <index> - Remove a video from the queue.

- !clearqueue - Clear the entire queue.
  
**Playback Control**
  - !join <guildId> <channelId> - Join a voice channel.

- !skip - Skip the current video.

- !pause - Pause the video.

- !stop - Stop playback and clear the queue.

- !resume - Resume the paused video.

- !loop - Toggle loop mode (repeat the current video).

## Running the Bot
To start the bot, run the following command:
```js
node index.js
```
## License 
This project is licensed under the MIT License - see the LICENSE file for details.



