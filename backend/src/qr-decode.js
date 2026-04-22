const jsQR = require("jsqr");
const jpeg = require("jpeg-js");
const { PNG } = require("pngjs");

function registerQrDecodeRoutes(app) {
  app.post("/api/qr/decode", async (req, res) => {
    const imageBase64 = String(req.body?.imageBase64 || "").trim();
    if (!imageBase64) {
      res.status(400).json({
        ok: false,
        message: "缺少二维码图片数据",
      });
      return;
    }

    try {
      const decoded = decodeQrFromBase64(imageBase64);
      const normalizedValue = normalizeScanValue(decoded.rawValue);
      res.json({
        ok: true,
        data: {
          rawValue: decoded.rawValue,
          scanValue: normalizedValue || decoded.rawValue,
          imageType: decoded.imageType,
          width: decoded.width,
          height: decoded.height,
        },
      });
    } catch (error) {
      const message = error && error.message ? error.message : "二维码识别失败";
      const status = /暂不支持|图片格式/.test(message) ? 415 : 400;
      res.status(status).json({
        ok: false,
        message,
      });
    }
  });
}

function decodeQrFromBase64(dataUrl) {
  const parsed = parseImagePayload(dataUrl);
  const image = decodeImageBuffer(parsed.mimeType, parsed.buffer);
  const rgbaData =
    image.data instanceof Uint8ClampedArray ? image.data : new Uint8ClampedArray(image.data);

  const result = jsQR(rgbaData, image.width, image.height, {
    inversionAttempts: "attemptBoth",
  });

  if (!result || !String(result.data || "").trim()) {
    throw new Error("未识别到二维码，请对准二维码重新拍照");
  }

  return {
    rawValue: String(result.data || "").trim(),
    imageType: parsed.mimeType,
    width: image.width,
    height: image.height,
  };
}

function parseImagePayload(dataUrl) {
  const text = String(dataUrl || "").trim();
  const match = text.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,([\s\S]+)$/i);
  if (!match) {
    throw new Error("图片格式不正确，请重新拍摄二维码");
  }

  const mimeType = String(match[1] || "").toLowerCase();
  const base64 = String(match[2] || "").trim();
  if (!base64) {
    throw new Error("图片数据为空，请重新拍摄二维码");
  }

  return {
    mimeType,
    buffer: Buffer.from(base64, "base64"),
  };
}

function decodeImageBuffer(mimeType, buffer) {
  if (!buffer || !buffer.length) {
    throw new Error("图片数据为空，请重新拍摄二维码");
  }

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return jpeg.decode(buffer, {
      useTArray: true,
      formatAsRGBA: true,
    });
  }

  if (mimeType === "image/png") {
    const png = PNG.sync.read(buffer);
    return {
      data: png.data,
      width: png.width,
      height: png.height,
    };
  }

  throw new Error("暂不支持当前图片格式，请使用拍照或 PNG/JPG 图片");
}

function normalizeScanValue(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return "";
  }

  try {
    const url = new URL(text, "https://local.qr/");
    const scan =
      String(
        url.searchParams.get("scan") ||
          url.searchParams.get("scanValue") ||
          url.searchParams.get("deviceCode") ||
          url.searchParams.get("code") ||
          ""
      ).trim();
    if (scan) {
      return scan;
    }
  } catch (error) {
    return text;
  }

  return text;
}

module.exports = {
  registerQrDecodeRoutes,
};
