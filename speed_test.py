#!/usr/bin/env python3
"""Measure download speed by making ten sequential requests to a URL."""

import argparse
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


REQUEST_COUNT = 10
CHUNK_SIZE = 64 * 1024


def download(url: str, timeout: float) -> tuple[float, int]:
    """Return elapsed seconds and bytes read after fully consuming the response."""
    request = Request(url, headers={"User-Agent": "internet-speed-test/1.0"})
    started = time.perf_counter()
    with urlopen(request, timeout=timeout) as response:
        size = 0
        while True:
            chunk = response.read(CHUNK_SIZE)
            if not chunk:
                break
            size += len(chunk)
    return time.perf_counter() - started, size


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Measure download speed with ten sequential HTTP requests."
    )
    parser.add_argument("url", help="URL of the file or resource to download")
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="timeout in seconds for each request (default: 30)",
    )
    args = parser.parse_args()

    if args.timeout <= 0:
        parser.error("--timeout must be greater than zero")

    elapsed_times = []
    total_bytes = 0

    try:
        for number in range(1, REQUEST_COUNT + 1):
            elapsed, size = download(args.url, args.timeout)
            elapsed_times.append(elapsed)
            total_bytes += size
            print(
                "Запрос {}/{}: {:.2f} с, {} байт".format(
                    number, REQUEST_COUNT, elapsed, size
                )
            )
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        print("Ошибка запроса: {}".format(error), file=sys.stderr)
        return 1

    total_time = sum(elapsed_times)
    average_time = total_time / REQUEST_COUNT
    speed_mbit_s = total_bytes * 8 / total_time / 1_000_000 if total_time else 0

    print("\nСреднее время запроса: {:.2f} с".format(average_time))
    print("Всего скачано: {} байт ({:.2f} МБ)".format(total_bytes, total_bytes / 1_000_000))
    print("Скорость скачивания: {:.2f} Мбит/с".format(speed_mbit_s))
    return 0


if __name__ == "__main__":
    sys.exit(main())
