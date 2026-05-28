const mammoth = require('mammoth');

const STYLE_MAP = [
  "p[style-name='Title'] => h1",
  "p[style-name='Subtitle'] => h2",
  "p[style-name='Heading 1'] => h1",
  "p[style-name='Heading 2'] => h2",
  "p[style-name='Heading 3'] => h3",
  "p[style-name='Heading 4'] => h4",
  "p[style-name='Quote'] => blockquote",
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em",
];

async function convertirDocxAHtml(buffer) {
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: STYLE_MAP,
      convertImage: mammoth.images.imgElement((image) =>
        image.read('base64').then((data) => ({ src: `data:${image.contentType};base64,${data}` }))
      ),
    }
  );
  return { html: result.value || '<p></p>', messages: result.messages || [] };
}

module.exports = { convertirDocxAHtml };
