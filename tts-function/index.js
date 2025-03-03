const textToSpeech = require('@google-cloud/text-to-speech');

const client = new textToSpeech.TextToSpeechClient();

exports.synthesizeSpeech = async (req, res) => {
  // Handle preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');       // Allow any origin
    res.set('Access-Control-Allow-Methods', 'GET');    // or "GET,POST" etc. if needed
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');         // Cache preflight response for 1 hour
    res.status(204).send('');                          // No content for OPTIONS request
    return;
  }

  // Set CORS header for the actual request
  res.set('Access-Control-Allow-Origin', '*'); // Or restrict to specific domain, e.g. "http://localhost:3000"

  // Now handle your GET logic
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const text = req.query.text;
  if (!text) {
    res.status(400).send('Missing "text" parameter.');
    return;
  }

  const request = {
    input: { text: text },
    // Specify a particular voice for better quality—try a Wavenet voice if available
    voice: { languageCode: 'en-US', name: 'en-US-Wavenet-D', ssmlGender: 'NEUTRAL' },
    // Adjust audio configuration: increase volumeGainDb if needed
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.8,
      pitch: -2.0,
      volumeGainDb: 5.0  // Increase this value if the output is too quiet
    }
  };
  

  try {
    const [response] = await client.synthesizeSpeech(request);
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.audioContent);
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    res.status(500).send('Error synthesizing speech');
  }
};
