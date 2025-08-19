export class NoContentToEditError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export const extractBlocksFromText = (text: string, lang: string) => {
  const blocks = text.match(/```json\s*([\s\S]*)\s*```/);
  const blocksText = blocks ? blocks[1] : text;
  try {
    const blocksJson = JSON.parse(blocksText);
    const blocksWithLang = blocksJson.map((block: any) => {
      if (!lang) {
        return block;
      }
      Object.keys(block).forEach((key) => {
        if (key !== "_id" && key !== "_type" && key !== "_parent") {
          block[`${key}-${lang}`] = block[key];
          delete block[key];
        }
      });
      return block;
    });
    return blocksWithLang;
  } catch (e) {
    console.error(e);
    return [];
  }
};
