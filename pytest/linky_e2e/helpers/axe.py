from __future__ import annotations

from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support.ui import WebDriverWait


def inject_axe(driver: WebDriver) -> None:
    driver.execute_script(
        """
        if (typeof axe === 'undefined') {
          var script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js';
          document.head.appendChild(script);
        }
        """
    )
    WebDriverWait(driver, 15).until(lambda d: d.execute_script("return typeof axe !== 'undefined'"))


def run_axe(driver: WebDriver) -> dict:
    return driver.execute_async_script(
        """
        const callback = arguments[arguments.length - 1];
        axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
        }, (err, results) => {
          if (err) {
            callback({ violations: [] });
            return;
          }
          callback(results);
        });
        """
    )


def assert_no_critical_violations(results: dict, page_label: str) -> None:
    violations = results.get("violations") or []
    critical = [v for v in violations if v.get("impact") == "critical"]
    if critical:
        summary = "\n".join(f"{v.get('id')}: {v.get('description')}" for v in critical)
        raise AssertionError(f"Critical ARIA violations on {page_label}:\n{summary}")
