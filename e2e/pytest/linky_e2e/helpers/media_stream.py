from __future__ import annotations

from typing import TYPE_CHECKING, Any

from linky_e2e.config import settings

if TYPE_CHECKING:
    from selenium.webdriver.remote.webdriver import WebDriver

_WARMUP_FAKE_MEDIA_SCRIPT = """
const done = arguments[0];
navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 640, height: 360 } })
  .then((stream) => {
    const videoTracks = stream.getVideoTracks();
    done({
      ok: true,
      hasVideo: videoTracks.length > 0,
      labels: videoTracks.map((track) => track.label || ""),
    });
    stream.getTracks().forEach((track) => track.stop());
  })
  .catch((err) => {
    done({
      ok: false,
      error: err && err.name ? `${err.name}: ${err.message}` : String(err),
    });
  });
"""


def grant_media_permissions(driver: WebDriver, origin: str | None = None) -> None:
    target = (origin or settings.base_url).rstrip("/")
    try:
        driver.execute_cdp_cmd(
            "Browser.grantPermissions",
            {
                "origin": target,
                "permissions": ["videoCapture", "audioCapture"],
            },
        )
    except Exception:
        pass


def warmup_fake_media(driver: WebDriver, *, origin: str | None = None) -> dict[str, Any]:
    grant_media_permissions(driver, origin)
    result = driver.execute_async_script(_WARMUP_FAKE_MEDIA_SCRIPT)
    if not isinstance(result, dict):
        raise RuntimeError(f"Fake media warmup returned unexpected value: {result!r}")
    if not result.get("ok"):
        raise RuntimeError(f"Fake media warmup failed: {result.get('error', result)}")
    if not result.get("hasVideo"):
        raise RuntimeError(
            "Fake media warmup succeeded but no video track was returned. "
            "Ensure the browser was launched with --use-fake-device-for-media-stream."
        )
    return result
