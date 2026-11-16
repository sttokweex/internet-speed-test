#!/usr/bin/env node

const REQUEST_COUNT = 10;

function parseArgs(args) {
  let url;
  let timeout = 30;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      console.log("Usage: node speed-test.js <url> [--timeout seconds]");
      console.log("Measure download speed with ten sequential HTTP requests.");
      process.exit(0);
    }

    if (arg === "--timeout") {
      timeout = Number(args[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (url) {
      throw new Error("Only one URL can be provided.");
    }
    url = arg;
  }

  if (!url) {
    throw new Error("A URL is required. Run with --help for usage.");
  }
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error("--timeout must be a number greater than zero.");
  }

  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("URL must use HTTP or HTTPS.");
  }

  return { url: parsedUrl.toString(), timeout };
}

async function download(url, timeout) {
  const started = performance.now();
  const response = await fetch(url, {
    headers: { "user-agent": "internet-speed-test/1.0" },
    signal: AbortSignal.timeout(timeout * 1000),
  });

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  let bytes = 0;
  if (response.body) {
    for await (const chunk of response.body) {
      bytes += chunk.byteLength;
    }
  }

  return { seconds: (performance.now() - started) / 1000, bytes };
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const results = [];
  try {
    for (let index = 0; index < REQUEST_COUNT; index += 1) {
      const result = await download(options.url, options.timeout);
      results.push(result);
      console.log(
        `Запрос ${index + 1}/${REQUEST_COUNT}: ${result.seconds.toFixed(2)} с, ${result.bytes} байт`,
      );
    }
  } catch (error) {
    console.error(`Ошибка запроса: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const totalTime = results.reduce((sum, result) => sum + result.seconds, 0);
  const totalBytes = results.reduce((sum, result) => sum + result.bytes, 0);
  const averageTime = totalTime / REQUEST_COUNT;
  const speedMbitPerSecond = totalTime === 0 ? 0 : (totalBytes * 8) / totalTime / 1_000_000;

  console.log(`\nСреднее время запроса: ${averageTime.toFixed(2)} с`);
  console.log(`Всего скачано: ${totalBytes} байт (${(totalBytes / 1_000_000).toFixed(2)} МБ)`);
  console.log(`Скорость скачивания: ${speedMbitPerSecond.toFixed(2)} Мбит/с`);
}

main();
