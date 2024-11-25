const express = require('express');
const multer = require('multer');
const Jimp = require('jimp');
const fs = require('fs');
const { createCanvas } = require('canvas');

const app = express();
const upload = multer();

// Ensure the 'uploads' directory exists
if (!fs.existsSync('./uploads')){
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
        <input type="text" name="characters" id="characters" value="01">
        <br>
        <label for="bgColor">Background Color:</label>
        <input type="text" name="bgColor" id="bgColor" value="black">
        <br>
        <label for="fontSize">Font Size:</label>
        <input type="number" name="fontSize" id="fontSize" value="-3">
        <br>
        <input type="checkbox" name="grayscale" id="grayscale">
        <label for="grayscale">Grayscale</label>
        <br>
        <label for="browser">Browser:</label>
        <select name="browser" id="browser">
          <option value="ie">Internet Explorer</option>
          <option value="firefox">Firefox</option>
        </select>
        <br>
        <input type="checkbox" name="contrast" id="contrast">
        <label for="contrast">Contrast</label>
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
      characters = '01',
      bgColor = 'black',
      fontSize = 2,
      grayscale = false,
      browser = 'ie',
      contrast = false
    } = req.body;

    if (contrast) {
      image.contrast(0.5); 
    }

    image.resize(parseInt(width, 10), Jimp.AUTO);

    if (browser === 'ie') {
      image.scale(1, 0.65);
    } else {
      image.scale(1, 0.43);
    }

    if (grayscale === 'on') {
      image.grayscale();
    }

    const charArray = characters.split('');
    let textTypeCount = -1;

    const height = image.bitmap.height;

    let asciiArt = '';

    let oldColor = null;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = Jimp.intToRGBA(image.getPixelColor(x, y));
        const hexColor = rgbToHex(color.r, color.g, color.b);

        if (hexColor !== oldColor) {
          textTypeCount = (textTypeCount + 1) % charArray.length;
          if (hexColor !== '#000000') {
            asciiArt += `<span style="color: ${hexColor}">${charArray[textTypeCount]}</span>`;
          } else {
            asciiArt += '&nbsp;'; 
          }
          oldColor = hexColor;
        } else {
          if (hexColor !== '#000000') {
            asciiArt += charArray[textTypeCount];
          } else {
            asciiArt += '&nbsp;'; 
          }
        }
      }
      asciiArt += '\n'; 
    }

    const canvas = createCanvas(image.bitmap.width * 10, image.bitmap.height * 10); // Adjust size as needed
    const ctx = canvas.getContext('2d');

    ctx.font = '10px monospace'; // Choose a TrueType font and size

    let x = 0;
    let y = 10; // Start drawing slightly down to avoid clipping

    asciiArt.split('\n').forEach(line => {
      const characters = line.match(/<span style="color: (#[0-9a-fA-F]{6})">(.?)<\/span>|&nbsp;/g);

      if (characters) {
        characters.forEach(char => {
          if (char === '&nbsp;') {
            x += 10; // Adjust spacing as needed
          } else {
            const match = char.match(/<span style="color: (#[0-9a-fA-F]{6})">(.?)<\/span>/);
            const color = match[1];
            const character = match[2];

            ctx.fillStyle = color;
            ctx.fillText(character, x, y);

            x += 10; // Adjust spacing as needed
          }
        });
      }

      x = 0;
      y += 10; // Adjust line height as needed
    });

    const out = fs.createWriteStream('./uploads/output.png');
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => console.log('The PNG file was created.'));

    let html = `
      <html>
      <head>
        <title>Text image</title>
        <style>
          body { background-color: ${bgColor}; font-family: monospace; }
          table { margin: 20px auto; }
          td { font-size: ${fontSize}px; white-space: pre; } 
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td>
              <pre>${asciiArt}</pre> 
            </td>
          </tr>
        </table>
      </body>
      </html>`;

    res.send(html);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error generating image');
  }
});

function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const port = 3000; 
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
