import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/** Synthetic menu for reproducible extraction tests, not a real café photo. */
async function main() {
  const directory = path.join(process.env.LOCALAPPDATA || ".", "Temp", "opencode", "cafe-ai-tests");
  await mkdir(directory, { recursive: true });
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="800"><rect width="1000" height="800" fill="white"/><g fill="black" font-family="Arial" font-size="35"><text x="70" y="100">CAFE CIRCLE - TEST MENU (INR)</text><text x="70" y="200">Iced Latte - Rs 220</text><text x="70" y="250">Cold coffee with milk. Ingredients: coffee, milk</text><text x="70" y="360">Hot Tea - Rs 120</text><text x="70" y="410">Hot black tea. Ingredients: tea, water</text><text x="70" y="520">Chocolate Cake</text><text x="70" y="570">Chocolate dessert. Price unavailable.</text></g></svg>`);
  await sharp(svg).png().toFile(path.join(directory, "menu.png"));
  await sharp(svg).jpeg().toFile(path.join(directory, "menu.jpg"));
  await sharp(svg).webp().toFile(path.join(directory, "menu.webp"));
  await sharp({ create: { width: 200, height: 100, channels: 3, background: "white" } }).png().toFile(path.join(directory, "unreadable.png"));
  console.log(`Synthetic fixtures: ${directory}`);
}
void main();
