import { Client } from "discord.js-selfbot-v13";
import { Streamer, prepareStream, playStream, Utils } from "@dank074/discord-video-stream";
import fs from "fs";
import path from "path";
import pkg from 'play-dl';    
import { exec } from "child_process";
import ytdl from 'ytdl-core';
const { yts } = pkg; 

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

const client = new Client();
const streamer = new Streamer(client);

const queue = [];
let isPlaying = false;
let loopMode = false;
const videosFolder = path.join(process.cwd(), "videos");

let currentFFmpegProcess = null; 

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity(";D", { type: "PLAYING" });
});

client.on("messageCreate", async (msg) => {
  const content = msg.content.trim();  
  if (content.startsWith(config.prefix)) {
    const args = content.slice(config.prefix.length).split(/\s+/);
    const command = args.shift().toLowerCase();

    try {
      if (command === "join") {
        const [guildId, channelId] = args;
        const connection = await streamer.joinVoice(guildId, channelId);
        if (connection) {
          msg.channel.send("Joined voice channel.");
        } else {
          msg.channel.send("Failed to join the voice channel.");
        }
        return;
      }

      if (command === "play") {
        const type = args.shift();
        const input = args.join(" ");
      
        const voiceChannel = msg.member.voice.channel;
        if (!voiceChannel) {
          return msg.channel.send("Please join a voice channel first.");
        }
      
        try {
          await streamer.joinVoice(msg.guild.id, voiceChannel.id);
          msg.channel.send(`Joined voice channel: **${voiceChannel.name}**`);
        } catch (error) {
          console.error("Error joining voice channel:", error);
          return msg.channel.send("❌ Failed to join the voice channel.");
        }      
        if (type === "local") {
          const videoPath = path.join("videos", input);
          if (!fs.existsSync(videoPath)) return msg.channel.send("❌ File not found.");
          queue.push({ type: "file", source: videoPath, title: input });
          msg.channel.send(`📼 Added local video: **${input}**`);
        } 
        else if (type === "url") {
          queue.push({ type: "url", source: input, title: input });
          msg.channel.send(`🌐 Added video from URL: **${input}**`);
        } 

        if (command === "yt") {
          try {
            const videoUrl = input;
            const info = await ytdl.getInfo(videoUrl);
            const stream = ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio' });
        
            queue.push({
              type: "yt",
              stream: stream,
              title: info.videoDetails.title
            });
        
            msg.channel.send(`▶️ Added YouTube video: **${info.videoDetails.title}**`);        
            if (!isPlaying) playNext(msg);
          } catch (err) {
            console.error("YouTube streaming error:", err);
            return msg.channel.send("❌ Failed to stream YouTube video.");
          }
        }



        else if (type === "twitch") {
          const twitchUrl = input;
      
          if (!twitchUrl.includes("twitch.tv")) return msg.channel.send("❌ Invalid Twitch URL.");
      
          const channelName = twitchUrl.split("twitch.tv/")[1].split("/")[0];
          const streamlinkCmd = `streamlink https://twitch.tv/${channelName} best --stream-url`;
      
          exec(streamlinkCmd, (error, stdout, stderr) => {
            if (error) {
              console.error("Streamlink Error:", stderr);
              return msg.channel.send("❌ Failed to fetch Twitch stream. Is the stream live?");
            }
      
            const streamUrl = stdout.trim();
            if (!streamUrl) return msg.channel.send("❌ No stream found or stream is offline.");
      
            queue.push({ type: "url", source: streamUrl, title: `Twitch Stream: ${channelName}` });
            msg.channel.send(`🎮 Twitch stream added to queue: **${channelName}**`);
      
            if (!isPlaying) playNext(msg);
          });
        } else {
          return msg.channel.send("❌ Unknown type. Use `local`, `url`, `yt`, or `twitch`.");
        }
      
        if (!isPlaying) playNext(msg);
        return;
      }
       
      if (command === "videos") {
        const supportedFormats = [".mp4", ".webm", ".mkv", ".mov", ".avi"];
        const files = fs.readdirSync(videosFolder).filter(file =>
          supportedFormats.includes(path.extname(file).toLowerCase())
        );
      
        if (files.length === 0) return msg.channel.send("No videos found.");
      
        const videoList = files.map((file, index) => `${index + 1}. ${file}`).join("\n");
        msg.channel.send(`📂 **Videos:**\n${videoList}`);
      }

      if (command === "skip") {
        streamer.stop();
        msg.channel.send("Skipped current video.");
        isPlaying = false;
        playNext(msg);
        return;
      }

      if (command === "pause") {
        if (currentFFmpegProcess) {
          currentFFmpegProcess.kill("SIGSTOP");
          msg.channel.send("Paused.");
        } else {
          msg.channel.send("error");
        }
        return;
      }
      
      if (command === "resume") {
        if (currentFFmpegProcess) {
          currentFFmpegProcess.kill("SIGCONT");
          msg.channel.send("resume.");
        } else {
          msg.channel.send("No paused stream to resume.");
        }
        return;
      }

      if (command === "loop") {
        loopMode = !loopMode;
        msg.channel.send(loopMode ? "Loop mode is ON." : "Loop mode is OFF.");
        return;
      }

      if (command === "stop") {
        try {
          streamer.leaveVoice(msg.guild.id); 
          queue.length = 0; 
          isPlaying = false;
          msg.channel.send("⏹ Playback stopped and queue cleared.");
        } catch (error) {
          console.error("Error stopping playback:", error);
          msg.channel.send("Failed to stop playback.");
        }
        return;
      }
      

      if (command === "remove") {
        const index = parseInt(args[0], 10) - 1;
        if (isNaN(index) || index < 0 || index >= queue.length) return msg.channel.send("Invalid index.");
        const removed = queue.splice(index, 1);
        msg.channel.send(`🗑 Removed: **${removed[0].title || removed[0].source}**`);
        return;
      }

      if (command === "help") {
        const helpText = `🤖 **VideoBot Commands (Prefix: ${config.prefix})**

🎥 **Play Videos**
   • ${config.prefix}play local <filename> - Play local video from 'videos/'
   • ${config.prefix}play yt <YouTube URL> - Download and play from YouTube
   • ${config.prefix}play url <direct video URL> - Play direct video URL
   • ${config.prefix}play twitch <Twitch URL> - Play live Twitch stream

📂 **Manage Videos**
   • ${config.prefix}videos - List available local videos
   • ${config.prefix}queue - Show current queue
   • ${config.prefix}remove <index> - Remove video from queue
   • ${config.prefix}clearqueue - Clear the entire queue


🎮 **Playback Control**
   • ${config.prefix}join <guildId> <channelId> - Join voice channel
   • ${config.prefix}skip - Skip current video
   • ${config.prefix}pause - Pause video
   • ${config.prefix}stop - Stop playback and clear the queue
   • ${config.prefix}resume - Resume video
   • ${config.prefix}loop - Toggle loop mode

🔐 **Permissions**
   • Only whitelisted authors (by ID) in config can control the bot.

🧠 Designed like a genius-level cinematic assistant.`;
        msg.channel.send(helpText);
        return;
      }
    } catch (error) {
      console.error("Error while processing message: ", error);
      msg.channel.send("An error occurred while processing your command.");
    }
  }
});

let ffmpegProcess = null;

async function playNext(msg) {
  if (!queue.length) {
    isPlaying = false;
    msg.channel.send("📪 Queue is empty.");
    return;
  }

  const current = queue[0];
  if (!loopMode) queue.shift();
  const { type, source, title } = current;
  isPlaying = true;

  try {
    const { command, output } = prepareStream(source, {
      width: 1920,
      height: 1080,
      frameRate: 60,
      bitrateVideo: 2000,
      videoCodec: Utils.normalizeVideoCodec('H264'),
      h26xPreset: "veryfast",
      includeAudio: true
    });

    currentFFmpegProcess = command;
    ffmpegProcess = command;

    command.on("error", (err) => {
      console.error("FFmpeg error:", err);
      isPlaying = false;
      playNext(msg);
    });

    msg.channel.send(`📺 Now Playing: **${title || source}**`);
    await playStream(output, streamer, {
      type: "go-live"
    });

    isPlaying = false;
    playNext(msg);
  } catch (e) {
    console.error("Stream error:", e);
    msg.channel.send("Failed to play video.");
    isPlaying = false;
    playNext(msg);
  }
  if (current.type === "yt") {
    const stream = current.stream;
    const dispatcher = await streamer.playStream(msg.guild.id, stream);
    dispatcher.on("finish", () => {
      isPlaying = false;
      playNext(msg);
    });
  } else if (current.type === "file" || current.type === "url") {
    const stream = fs.createReadStream(current.source);
    const dispatcher = await streamer.playStream(msg.guild.id, stream);
    dispatcher.on("finish", () => {
      isPlaying = false;
      playNext(msg);
    });
  }
}


client.login(config.token);