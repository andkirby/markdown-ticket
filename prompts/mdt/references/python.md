# Python Reference

Language-specific patterns for MDT workflows. Load when project uses Python.

## Detection

Project is Python if any of:
- `pyproject.toml` exists
- `setup.py` exists
- `requirements.txt` exists
- `.py` files in source directory

## Test Frameworks

| Framework | Type | Config File | Command |
|-----------|------|-------------|---------|
| pytest | Unit/Integration | `pytest.ini`, `pyproject.toml` | `pytest` |
| pytest-bdd | BDD/E2E | `pytest.ini` + `.feature` files | `pytest --bdd` |
| behave | BDD | `behave.ini` | `behave` |
| unittest | Unit | (built-in) | `python -m unittest` |

## Test File Naming

| Convention | Example | Framework |
|------------|---------|-----------|
| `test_*.py` | `test_user.py` | pytest (prefix) |
| `*_test.py` | `user_test.py` | pytest (suffix) |
| `tests.py` | `tests.py` | Django |

**Directory patterns**:
```
tests/                   # Separate test directory
tests/unit/              # Unit tests
tests/integration/       # Integration tests
tests/e2e/               # E2E tests
src/module/tests/        # Co-located tests
features/                # BDD feature files (behave)
```

## BDD/Gherkin Examples

**pytest-bdd (E2E)**:
```python
# features/login.feature
Feature: User Login
  As a user
  I want to log into my account
  So that I can access my dashboard

  Scenario: Successful login
    Given I am on the login page
    When I enter valid credentials
    Then I should see the dashboard

# tests/e2e/test_login.py
import pytest
from pytest_bdd import scenarios, given, when, then

scenarios('../features/login.feature')

@given('I am on the login page')
def navigate_to_login(browser):
    browser.get('/login')

@when('I enter valid credentials')
def enter_credentials(browser):
    browser.find_element_by_id('email').send_keys('user@example.com')
    browser.find_element_by_id('password').send_keys('password123')
    browser.find_element_by_id('submit').click()

@then('I should see the dashboard')
def verify_dashboard(browser):
    assert '/dashboard' in browser.current_url
    assert browser.find_element_by_id('welcome-message').is_displayed()
```

**behave (BDD)**:
```python
# features/steps/login_steps.py
from behave import given, when, then

@given('I am on the login page')
def step_navigate_to_login(context):
    context.browser.get('/login')

@when('I enter valid credentials')
def step_enter_credentials(context):
    context.browser.find_element_by_id('email').send_keys('user@example.com')
    context.browser.find_element_by_id('password').send_keys('password123')
    context.browser.find_element_by_id('submit').click()

@then('I should see the dashboard')
def step_verify_dashboard(context):
    assert '/dashboard' in context.browser.current_url
```

**pytest (Unit/Integration)**:
```python
import pytest

class TestModuleName:
    """Tests for ModuleName"""

    def test_method_returns_expected_for_valid_input(self):
        result = method_name('valid')
        assert result == 'expected'

    def test_method_raises_for_invalid_input(self):
        with pytest.raises(ValueError, match='Invalid input'):
            method_name(None)

    class TestBoundaryHandling:
        """Boundary condition tests"""

        def test_accepts_at_limit(self):
            assert process_items([None] * 100) is not None

        def test_rejects_above_limit(self):
            with pytest.raises(ValueError):
                process_items([None] * 101)
```

## Selector Patterns (Selenium/Playwright)

**Preferred (stable)**:
```python
# By ID
browser.find_element_by_id('submit')

# By test attribute
browser.find_element_by_css_selector('[data-testid="submit"]')

# By accessible name
browser.find_element_by_xpath('//button[text()="Submit"]')

# Playwright for Python
page.get_by_test_id('submit')
page.get_by_role('button', name='Submit')
```

**Avoid (brittle)**:
```python
browser.find_element_by_css_selector('.btn.btn-primary')
browser.find_element_by_xpath('//div/form/button')
```

## Environment Variables

```python
import os

# Reading env vars
value = os.environ.get('MY_VAR')
value = os.getenv('MY_VAR', 'default')

# Testing with env vars (pytest)
def test_with_env(monkeypatch):
    monkeypatch.setenv('MY_VAR', 'test-value')
    # test code here

# Using pytest-env plugin
# pyproject.toml
# [tool.pytest.ini_options]
# env = ["MY_VAR=test-value"]
```

## Common Assertions

```python
# pytest assertions
assert value == expected
assert value in collection
assert 'substring' in string
assert callable_raises_error  # with pytest.raises

# pytest matchers
import pytest
with pytest.raises(ValueError):
    risky_function()

with pytest.raises(ValueError, match=r'.*pattern.*'):
    risky_function()

# Approximate comparisons
assert value == pytest.approx(3.14, rel=1e-2)
```

## Filter Commands

```bash
# pytest - filter by marker
pytest -m "cr_key"
pytest -k "test_specific"

# pytest - filter by file/directory
pytest tests/unit/test_specific.py
pytest tests/e2e/

# pytest-bdd - filter by tag
pytest --tags="@requirement:BR-1"

# behave - filter by tag
behave --tags="@requirement:BR-1"
behave features/login.feature
```

## Fixtures

```python
import pytest

@pytest.fixture
def sample_data():
    """Provide test data"""
    return {'key': 'value'}

@pytest.fixture
def mock_service(mocker):
    """Mock external service"""
    return mocker.patch('module.ExternalService')

@pytest.fixture(scope='session')
def database():
    """Session-scoped database connection"""
    db = connect_db()
    yield db
    db.close()
```
