const express = require('express');
const multer = require('multer');
const Jimp = require('jimp');
const fs = require('fs');
const { createCanvas } = require('canvas');

const app = express();
const upload = multer();

// Ensure the 'uploads' directory exists
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

app.get('/', (req, res) => {
    res.send(`
    <html>
    <head>
      <title>Image to Text</title>
    </head>
    <body>
      <h1>Image to Text Converter</h1>
      <form method="post" enctype="multipart/form-data">
        <input type="file" name="image" accept="image/*">
        <br>
        <label for="width">Width:</label>
        <input type="number" name="width" id="width" value="130">
        <br>
        <label for="characters">Characters:</label>
        <input type="text" name="characters" id="characters" value="LOVE">
        <br>
        <label for="fontSize">Font Size:</label>
        <input type="number" name="fontSize" id="fontSize" value="12">
        <br>
        <button type="submit">Generate</button>
      </form>
    </body>
    </html>
  `);
});

app.post('/', upload.single('image'), async (req, res) => {
    try {
        const image = await Jimp.read(req.file.buffer);

        const {
            width = 130,
            characters = 'LOVE',
            fontSize = 12
        } = req.body;

        // Resize image to fit the specified width
        image.resize(parseInt(width, 10), Jimp.AUTO);

        // Create a canvas with a transparent background
        const canvas = createCanvas(image.bitmap.width * fontSize, image.bitmap.height * fontSize);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'transparent'; // Set background to transparent
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${fontSize}px monospace`;

        // Prepare characters for use
        const charArray = characters.split('');
        let charIndex = 0;

        // Map pixels to ASCII characters
        for (let y = 0; y < image.bitmap.height; y++) {
            for (let x = 0; x < image.bitmap.width; x++) {
                const pixelColor = Jimp.intToRGBA(image.getPixelColor(x, y));
                const brightness = (pixelColor.r + pixelColor.g + pixelColor.b) / 3;
                const alpha = pixelColor.a / 255;

                if (alpha > 0.1) { // Ignore fully transparent pixels
                    // Draw the next character in the sequence
                    ctx.fillStyle = `rgba(${pixelColor.r}, ${pixelColor.g}, ${pixelColor.b}, ${alpha})`;
                    ctx.fillText(charArray[charIndex], x * fontSize, (y + 1) * fontSize);

                    // Cycle through the characters to maintain the sequence
                    charIndex = (charIndex + 1) % charArray.length;
                }
            }
        }

        // Save canvas to file
        const outputPath = './uploads/output.png';
        const out = fs.createWriteStream(outputPath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        out.on('finish', () => console.log('The PNG file was created.'));

        // Send the resulting image
        res.sendFile(outputPath, { root: __dirname });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error generating ASCII art.');
    }
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
