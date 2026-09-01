# Unit Testing Standards

This chapter is organized based on the Python official standard-library **unittest documentation** (https://docs.python.org/3/library/unittest.html) and the **pytest official documentation** (https://docs.pytest.org/en/stable/). unittest is the testing framework provided by the Python official standard library; pytest is not part of the standard library, but has become the de facto standard testing framework in the Python community. Rules in this chapter related to pytest are annotated as "Basis: community practice" to distinguish them from the official-standard-library status of unittest.

## 5.1 Test Framework Selection

1.  **SHOULD** Prefer **pytest** as the testing framework for new projects: pytest supports native `assert` statement introspection (no need to memorize dedicated method names such as `self.assertEqual`), automatic test module and function discovery, and a modular fixture mechanism, with lower writing and maintenance cost than `unittest.TestCase`.
    > Original text (pytest's official positioning): *"pytest: helps you write better programs."* *"The pytest framework makes it easy to write small, readable tests, and can scale to support complex functional testing for applications and libraries."*
    > Source: docs.pytest.org/en/stable/ (Basis: community practice, not Python official standard-library documentation, but the official Python unittest documentation also references pytest in "See also" as "a third-party test framework with a lighter-weight syntax")
    >
    > Original text from the official unittest documentation: *"Third-party unittest framework with a lighter-weight syntax for writing tests. For example, `assert func(10) == 42."*` (pointing to pytest)
    > Source: docs.python.org/3/library/unittest.html § See also

2.  **MAY** Legacy projects, or scenarios with strict restrictions on third-party dependencies (requiring the use of the standard library only), may continue to use `unittest`. `unittest` is provided by the official standard library, its syntax style is inspired by JUnit, and it provides the `TestCase` base class along with assertion methods such as `assertEqual()`/`assertTrue()`/`assertRaises()`.
    > Source: docs.python.org/3/library/unittest.html

## 5.2 Test Organization

3.  **MUST** Test code must be placed in a separate `tests/` (or `test/`) directory; mixing it with business code in the same directory is prohibited.
4.  **MUST** Test file names must be prefixed with `test_`, corresponding to the module under test: if the code file under test is `xxx.py`, the test file must be named `test_xxx.py`. This is both the default discovery rule of pytest and conforms to the `test*.py` matching pattern of `unittest discover`.
    Positive example: `test_sample.py`
    ```python
    def func(x):
        return x + 1

    def test_answer():
        assert func(3) == 5
    ```
    > Original text (unittest test discovery): *"all of the test files must be modules or packages importable from the top-level directory of the project... The basic command-line usage is: `python -m unittest discover`"*, default matching pattern `test*.py`
    > Source: docs.python.org/3/library/unittest.html § Test Discovery

5.  **MUST** Good unit tests must follow the AIR principle: Automatic (fully automated, requiring no manual intervention to judge results), Independent (test cases must not depend on each other or on execution order), Repeatable (not affected by external environments such as network, time, random numbers; can be executed repeatedly with the same conclusion).
    > Source: a well-known Java development manual's unit testing chapter (the AIR principle—Automatic/Independent/Repeatable—was explicitly proposed in that manual and marked as a **MUST** level unit testing quality guideline; it was originally a Java-oriented rule, and this standard applies it cross-language to the Python scenario; audit correction: it was previously annotated as the vague "Basis: community practice", but it actually has a clearly traceable origin, not a generic industry consensus)

6.  **MUST** Unit test cases must not call each other, and must not depend on the execution order or residual state of other cases. The test granularity should be as fine as possible (method-level or class-level), so that when a test fails, the problem can be quickly located.

7.  **MUST** Test code that depends on external environments (network, real databases, message queues, etc.) does not fall within the scope of unit testing (it belongs to integration testing). Unit tests should replace these external dependencies via dependency injection or mock/fake to ensure repeatability and independence from external environments. For database-related tests that do require operating on real data, data should be inserted/cleaned programmatically; manually pre-populating or leaving residual data in the database is prohibited.

## 5.3 Assertions and Coverage

8.  **MUST** Test cases must use assertion methods (`assert` statements / `self.assertXxx()`) to verify results; using `print()` to output results for manual visual inspection is prohibited, as it violates the "Automatic" requirement of the AIR principle.

9.  **SHOULD** The statement coverage and branch coverage of core business modules should reach as high a level as possible; new code should be accompanied by corresponding tests, and if new code affects the passing results of existing test cases, they must be fixed promptly. The specific quantitative coverage thresholds (e.g., 70%/100%) should be set by the team based on the project's risk level; this standard does not impose a uniform hard numerical threshold.
    > Basis: community practice (coverage as a quality signal is widely adopted; specific thresholds are team governance decisions, not values mandated by the Python official or pytest official documentation)

10. **MAY** When writing test cases, the BCDE principle may be referenced to ensure sufficient coverage: Border (boundary values, including loop boundaries, special values, special time points, etc.), Correct (expected results under correct input), Design (write tests in conjunction with design documents), Error (force error input, such as illegal data, exception flows, verifying that exception paths behave as expected).
    > Source: a well-known Java development manual's unit testing chapter (the BCDE principle was explicitly proposed in that manual as a test case writing guideline; it was originally a Java-oriented rule, and this standard applies it cross-language to the Python scenario; audit correction: it was previously annotated as the vague "Basis: community practice", now corrected to the specific origin)

## 5.4 Test Doubles and Isolation

11. **SHOULD** Use `unittest.mock` (standard library) or pytest-ecosystem tools such as `pytest-mock` to isolate external dependencies (network calls, time, random numbers, etc.), making test results deterministic and repeatable.

12. **SHOULD** In pytest projects, test setup/teardown logic should preferably be expressed using `fixture` (`@pytest.fixture`) rather than repeating initialization code inside each test function; shared fixtures should be placed in `conftest.py`.
    > Basis: community practice (pytest fixture is the core mechanism officially recommended by pytest; the official documentation explicitly lists it as one of the core features: *"Modular fixtures"*)
    > Source: docs.pytest.org/en/stable/

## 5.5 Misconceptions That Should Not Exist

13. **MAY** Unit testing is part of the developer's own work, not "something only testers need to care about"; incremental code for core business, core applications, and core modules should have corresponding unit tests completed before being submitted for testing, rather than being added after release.
