const express = require('express');
const textToSpeech = require('@google-cloud/text-to-speech');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Create a Text-to-Speech client with your service account key
const client = new textToSpeech.TextToSpeechClient({
  keyFilename: "C:\Web Dev\spelling-game\spelling-game-452422-2d1f884f86b8.json" // Replace with the actual path to your key file
});

// Define an API endpoint for TTS
app.get('/api/synthesize', async (req, res) => {
  try {
    const text = req.query.text;
    if (!text) {
      return res.status(400).send('Missing text parameter.');
    }
    const request = {
      input: { text: text },
      voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.8, pitch: -2.0 }
    };

    const [response] = await client.synthesizeSpeech(request);
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.audioContent);
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    res.status(500).send('Error synthesizing speech');
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
