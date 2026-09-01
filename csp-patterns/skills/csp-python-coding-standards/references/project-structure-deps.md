# Project Structure and Dependency Management Guidelines

This chapter is compiled based on the **Python Packaging User Guide** (packaging.python.org, maintained by the Python Packaging Authority / PyPA, and part of the official python.org documentation site) and related PEPs (517/518/621), as well as the official `venv` documentation.

### 8.1 Project Metadata: pyproject.toml

1.  **MUST** Every new Python project's root directory must contain a `pyproject.toml` file. The official documentation "strongly recommends" that every project place this file at the root of its source tree, even if its full capabilities are not yet needed.
    > Original text: *"While it is not technically necessary yet, it is STRONGLY RECOMMENDED for a project to have a pyproject.toml file at the root of its source tree."*
    > Source: packaging.python.org/en/latest/discussions/setup-py-deprecated/

2.  **MUST** `pyproject.toml` must contain a `[build-system]` table declaring the build backend and its dependencies; this is an officially "strongly recommended" table that lets installation/build tools such as `pip`/`build` know which backend to use to build the current project, without relying on the implicit assumption that a particular backend happens to be installed.
    Positive example:
    ```toml
    [build-system]
    requires = ["hatchling >= 1.26"]
    build-backend = "hatchling.build"
    ```
    > Original text: *"The `[build-system]` table is strongly recommended. It allows you to declare which build backend you use and which other dependencies are needed to build your project."*
    > Source: packaging.python.org/en/latest/guides/writing-pyproject-toml/
    >
    > The specification of the `[build-system]` table itself and the `requires` field comes from PEP 518: *"This PEP specifies how Python software packages should specify what build dependencies they have..."*
    > Source: PEP 518

3.  **MUST** For new projects, project metadata (name/version/dependencies/requires-python, etc.) must be written in the `[project]` table, rather than continuing to rely on dynamic configuration in `setup.py`/`setup.cfg`; `setup.py` should be retained only when programmatic configuration is genuinely needed (e.g., building C extensions), and in that case `setup.py` serves only as an auxiliary script for the build backend and no longer bears the responsibility of declaring basic metadata.
    > Original text: *"For new projects, use the [project] table, and keep setup.py only if some programmatic configuration is needed (such as building C extensions), but the setup.cfg and setup.py formats are still valid."*
    > Source: packaging.python.org/en/latest/guides/writing-pyproject-toml/
    >
    > The standardized definition of the `[project]` table comes from PEP 621: *"This PEP specifies how to write a project's core metadata in a pyproject.toml file for packaging-related tools to consume."*
    > Source: PEP 621

4.  **MUST** In the `[project]` table, the `name` field must be declared statically (this is the only field the official specification requires to be statically declared); the `version` field must be present, and may either be declared statically or marked as `dynamic = ["version"]` to be computed dynamically by the build backend (e.g., read from a git tag or the module's `__version__`). You must choose one of these two approaches; you cannot neither statically declare it nor mark it as dynamic.
    Positive example (minimal example, from the official tutorial):
    ```toml
    [project]
    name = "example_package_YOUR_USERNAME_HERE"
    version = "0.0.1"
    authors = [
        { name="Example Author", email="author@example.com" },
    ]
    description = "A small example package"
    readme = "README.md"
    requires-python = ">=3.10"
    classifiers = [
        "Programming Language :: Python :: 3",
        "Operating System :: OS Independent",
    ]
    license = "MIT"

    [project.urls]
    Homepage = "https://github.com/pypa/sampleproject"
    Issues = "https://github.com/pypa/sampleproject/issues"
    ```
    > Original text: *"The only keys required to be statically defined are: name"* *"The keys which are required but may be specified either statically or listed as dynamic are: version"*
    > Source: packaging.python.org/en/latest/specifications/pyproject-toml/

5.  **MUST** Dependency declarations must be written in `[project.dependencies]` (runtime dependencies) and `[project.optional-dependencies]` (optional/development-time dependency groups, e.g., `dev`, `test`); continuing to hand-write a standalone `requirements.txt` as the sole source of dependencies is prohibited (`requirements.txt` may still exist as an export product of a `pip freeze` lock result, but it should not be the authoritative source of dependency declarations).
    > Basis: In the official packaging.python.org specification, the list of allowed fields in the `[project]` table includes `dependencies`/`optional-dependencies` (see the source of the previous item); this item is an engineering-practice recommendation based on that specification (Basis: community practice)

### 8.2 Project Directory Structure

6.  **SHOULD** New projects should adopt the **src-layout**: place the importable package code under a `src/<package_name>/` subdirectory, rather than directly at the project root (flat-layout). The official packaging tutorial itself uses src-layout as the demonstration structure.
    Positive example (official tutorial structure):
    ```
    packaging_tutorial/
    ├── LICENSE
    ├── pyproject.toml
    ├── README.md
    ├── src/
    │   └── example_package/
    │       ├── __init__.py
    │       └── example.py
    └── tests/
    ```
    > Official explanation of the three objective advantages of src-layout: *"The src layout requires installation of the project to be able to run its code, and the flat layout does not."* *"The src layout helps prevent accidental usage of the in-development copy of the code... if an import package exists in the current working directory with the same name as an installed import package, the variant from the current working directory will be used."* *"The src layout helps enforce that an editable installation is only able to import files that were meant to be importable."*
    > Source: packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/
    >
    > Note: The official comparison page itself **does not give a mandatory preference conclusion** between the two layouts (a neutral statement of the "is not a strong recommendation" form); this **SHOULD**-level decision is based on the packaging tutorial's default demonstration + the three objective advantages of src-layout, rather than an official "mandatory requirement." Teams may also choose flat-layout based on legacy constraints, but within the same organization the choice should be as uniform as possible.

7.  **MUST** Test code must be placed in a standalone `tests/` directory at the project root, not mixed with the business code under `src/` (consistent with item 3 of `unit-testing.md`).

### 8.3 Virtual Environments

8.  **MUST** All Python project development must use a virtual environment to isolate dependencies; installing project dependencies directly into the system-global Python environment is prohibited. The official standard-library `venv` module has been officially recommended as the standard way to create virtual environments since Python 3.5.
    > Original text: *"The venv module supports creating lightweight 'virtual environments'... A virtual environment is created on top of an existing Python installation... and by default is isolated from the packages in the base environment."* *"Changed in version 3.5: The use of venv is now recommended for creating virtual environments."*
    > Source: docs.python.org/3/library/venv.html

9.  **MUST** The virtual environment directory must be named `.venv` or `venv` (the conventionally accepted names) and **must not** be checked into version control (it must be added to `.gitignore`); the virtual environment should be treated as a disposable artifact that can be deleted and rebuilt at any time, and no project code may be stored in it.
    > Original text: *"Contained in a directory, conventionally named .venv or venv in the project directory... Not checked into source control systems such as Git... Considered as disposable – it should be simple to delete and recreate it from scratch. You don't place any project code in the environment."*
    > Source: docs.python.org/3/library/venv.html

10. **MAY** When you need to reproduce exactly the same dependency versions across machines (lock file), or wish to combine environment management with task running (task runner), you may choose workflow tools such as `pip-tools`, `Pipenv`, `Poetry`, `PDM`, or `Hatch`; the official Tool Recommendations page lists these tools side by side as "recognized" choices (the original list is "Flit, Hatch, nox, PDM, Pipenv, Poetry, tox"), without mandating any single one. Teams should make their own selection based on ecosystem maturity, build speed, and CI integration cost.
    > Original text: *"pip-tools and Pipenv are two recognized tools to create lock files, which contain the exact versions of all packages installed into an environment, for reproducibility purposes."* *"These tools are environment managers that automatically manage virtual environments for a project. They also act as 'task runners'... In alphabetical order: Flit, Hatch, nox, PDM, Pipenv, Poetry, tox."*
    > Source: packaging.python.org/en/latest/guides/tool-recommendations/

    In addition, **audit correction**: `uv` does not appear in the Workflow tools list on the official Tool Recommendations page (a previous version of this text placed `uv` alongside that list and included unreferenced speculative descriptions such as "widely adopted"; these are hereby deleted and corrected). Upon verification, the current precise inclusion status of `uv` in the official packaging.python.org documentation is:
    - It has been included in the Project Summaries page of packaging.python.org, categorized as one of the "Non-PyPA Projects," with the official description: *"A Python package and project manager, written in Rust for high performance."*
      > Source: packaging.python.org/en/latest/key_projects/#uv
    - `uv-build` has appeared as one of the optional build backends in the official "Writing your pyproject.toml" guide's examples, alongside Hatchling/setuptools/Flit-core/PDM-backend.
      > Source: packaging.python.org/en/latest/guides/writing-pyproject-toml/

    In summary, `uv` has entered the PyPA official documentation's view (Project Summaries + build backend examples), but has not yet been formally included in the "recommended workflow tools" list on the Tool Recommendations page. Teams may consider it as a selection reference, but should not cite this guideline or misrepresent that "the official has recommended uv" as a decision basis.

### 8.4 Installation, Build, and Publishing Tools

11. **MUST** Third-party packages must be installed using `pip` (the official standard installation tool); the deprecated `easy_install`, `python setup.py install`, and `python setup.py develop` are **prohibited**.
    > Original text: *"Pip is the standard tool to install packages from PyPI."* *"Do not use easy_install (part of Setuptools), which is deprecated in favor of pip. Likewise, do not use python setup.py install or python setup.py develop, which are also deprecated."*
    > Source: packaging.python.org/en/latest/guides/tool-recommendations/

12. **MUST** Building source distributions (sdist) and wheels must use the official standard build tool `build` (i.e., `python3 -m build`); the deprecated `python setup.py sdist`/`python setup.py bdist_wheel` are **prohibited**.
    > Original text: *"The standard tool to build source distributions and wheels for uploading to PyPI is build. It will invoke whichever build backend you declared in pyproject.toml."* *"Do not use python setup.py sdist and python setup.py bdist_wheel for this task. All direct invocations of setup.py are deprecated."*
    > Source: packaging.python.org/en/latest/guides/tool-recommendations/

13. **MUST** When publishing packages to PyPI, the deprecated and insecure `python setup.py upload` is **prohibited**; you should use `twine` to upload manually, or configure Trusted Publishing in CI/CD (the officially recommended secure publishing method that avoids storing long-lived tokens).
    > Original text: *"The other available method is to upload the package manually using twine."* *"Never use python setup.py upload for this task. In addition to being deprecated, it is insecure."*
    > Source: packaging.python.org/en/latest/guides/tool-recommendations/

14. **MUST** Using `distutils` in Python 3.12+ projects is prohibited (it has been removed from the standard library, PEP 632); when the relevant capabilities are needed, use `setuptools` instead (which continues to provide a `distutils` compatibility layer) or migrate to declarative `pyproject.toml` configuration.
    > Original text: *"Do not use distutils, which is deprecated, and has been removed from the standard library in Python 3.12, although it still remains available from setuptools."*
    > Source: packaging.python.org/en/latest/guides/tool-recommendations/; PEP 632 (removed starting in Python 3.12)

### 8.5 `requires-python` and Version Support Strategy

15. **MUST** The `[project]` table of `pyproject.toml` must declare the `requires-python` field, clearly stating the minimum Python version supported by the project, to prevent users from discovering runtime errors only after installing on an incompatible interpreter version.
    Positive example: `requires-python = ">=3.10"`

16. **MAY** When choosing the project's minimum supported version, you may refer to the official release cadence (PEP 602): starting with Python 3.13, each version receives 2 years of "full support" (bugfix) after release, followed by 3 years of security fixes only, for a total lifecycle of 5 years (3.9–3.12 have 1.5 years of full support + 3.5 years of security fixes, still totaling 5 years). Versions that have already entered the "security fixes only" phase or have reached EOL should no longer be used as the minimum support target for new projects.
    > Original text: *"After the release of Python 3.X.0, the 3.X series is maintained for five years... Note: 2 years of full support start with Python 3.13. Python versions 3.9 - 3.12 operate on a calendar with 1 1/2 year of full support, followed by 3 1/2 more years of security fixes."*
    > Source: PEP 602
