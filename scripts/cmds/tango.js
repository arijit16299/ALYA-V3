const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const jimp = require("jimp");

module.exports = {
  config: {
    name: "tango",
    version: "2.0.1",
    author: "Arijit",
    countDown: 5,
    role: 0,
    shortDescription: "Turn someone into Tango 🦧",
    longDescription: "Overlay user's avatar onto the body of Tango the orangutan.",
    category: "fun",
    guide: {
      en: "{pn} (reply to a message or tag someone) to turn them into Tango.",
    },
  },

  onStart: async function ({ event, message, api }) {
    let targetID =
      event.type === "message_reply"
        ? event.messageReply.senderID
        : Object.keys(event.mentions)[0];

    if (!targetID) {
      return message.reply("🦧 Please reply to someone's message or tag them to Tango-fy!");
    }

    const baseFolder = path.join(__dirname, "Arijit_tango");
    const bgPath = path.join(baseFolder, "tango_bg.jpg");
    const avatarPath = path.join(baseFolder, `avatar_${targetID}.png`);
    const outputPath = path.join(baseFolder, `tango_result_${targetID}.png`);

    try {
      if (!fs.existsSync(baseFolder)) fs.mkdirSync(baseFolder);

      // Tango background image
      const tangoImageURL = "https://files.catbox.moe/ip8kgf.jpg";
      if (!fs.existsSync(bgPath)) {
        const res = await axios.get(tangoImageURL, { responseType: "arraybuffer" });
        fs.writeFileSync(bgPath, res.data);
      }

      // User avatar
      const avatarURL = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const avatarBuffer = (await axios.get(avatarURL, { responseType: "arraybuffer" })).data;
      fs.writeFileSync(avatarPath, avatarBuffer);

      // Read images
      const bg = await jimp.read(bgPath);
      const avatar = await jimp.read(avatarPath);

      // Resize avatar and make it circular
      avatar.resize(110, 110).circle();

      // Face position
      const x = 255;
      const y = 32;
      bg.composite(avatar, x, y);

      await bg.writeAsync(outputPath);

      const userInfo = await api.getUserInfo(targetID);
      const name = userInfo[targetID]?.name || "Someone";

      await message.reply(
        {
          body: `🤣 ${name} has transformed into Tango! 🦧`,
          mentions: [{ tag: name, id: targetID }],
          attachment: fs.createReadStream(outputPath),
        },
        () => {
          // Cleanup
          if (fs.existsSync(avatarPath)) fs.unlinkSync(avatarPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
      );
    } catch (err) {
      console.error("🦧 Tango command error:", err);
      return message.reply("❌ Failed to create Tango image. Please try again later.");
    }
  },
};
