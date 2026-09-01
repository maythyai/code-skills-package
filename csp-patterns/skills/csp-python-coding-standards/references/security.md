# Security Standards

This chapter is organized based on the security warnings in the Python official standard-library documentation (module documentation for `pickle`, `subprocess`, `secrets`, `ast`, `tempfile`, `hashlib`, etc.) as well as the security statements in the PyYAML official documentation. Any code involving user input, serialization, subprocess invocation, cryptography, temporary files, or hash algorithm selection **must** consult this chapter.

## 6.1 Deserialization Security

1.  **MUST** It is prohibited to use `pickle.loads()`/`pickle.load()` to deserialize data from untrusted sources (user uploads, data received over the network, unauthenticated third-party systems). The `pickle` module officially warns that it is not secure: deserializing maliciously crafted pickle data can execute arbitrary code within the current process, equivalent to a code execution vulnerability.
    > Original text: *"Warning: The pickle module is not secure. Only unpickle data you trust."* *"It is possible to construct malicious pickle data which will execute arbitrary code during unpickling. Never unpickle data that could have come from an untrusted source, or that could have been tampered with."*
    > Source: docs.python.org/3/library/pickle.html
    >
    > If you do need to verify data integrity and prevent tampering, the official recommendation is: *"Consider signing data with hmac if you need to ensure that it has not been tampered with."* If processing untrusted data, the official recommendation is to use a safer serialization format: *"Safer serialization formats such as json may be more appropriate if you are processing untrusted data."*

2.  **MUST** It is prohibited to call `yaml.load()` on YAML content from untrusted sources without specifying a safe Loader. You must use `yaml.safe_load()` (which can only construct basic Python objects: numbers/strings/lists/dictionaries, etc.), or explicitly pass `Loader=yaml.SafeLoader` when using `yaml.load()`.
    > Original text (PyYAML official documentation): *"It is not safe to call yaml.load with any data received from an untrusted source! yaml.load is as powerful as pickle.load and so may call any Python function."* *"Note that the ability to construct an arbitrary Python object may be dangerous if you receive a YAML document from an untrusted source such as the Internet. The function `yaml.safe_load` limits this ability to simple Python objects like integers or lists."* (Audit correction: the second sentence was previously quoted as "If you don't trust the input YAML stream, you should use: yaml.safe_load(stream)", which could not be verified verbatim on the current pyyaml.org/wiki/PyYAMLDocumentation page; it has now been replaced with original text that can be verified verbatim on that page)
    > Source: pyyaml.org/wiki/PyYAMLDocumentation; github.com/yaml/pyyaml (README)

3.  **MUST** Parsing Python literal values in string form (numbers/lists/dictionaries, etc. in configuration files or external input) must not use `eval()`; use `ast.literal_eval()` instead. `literal_eval` can only parse literal structures such as strings/bytes/numbers/tuples/lists/dictionaries/sets/booleans/`None`/`Ellipsis`, and does not execute arbitrary code or perform name lookup. However, note that: the official 3.10+ documentation also states that `literal_eval` is not absolutely safe for all inputs (there is a possibility of triggering memory exhaustion or C stack overflow through extremely large/deeply nested inputs), so it is **still not recommended** to call it on completely untrusted data without length limits.
    > Original text: *"This function had been documented as 'safe' in the past without defining what that meant. That was misleading... it is not free from attack: A relatively small input can lead to memory exhaustion or to C stack exhaustion, crashing the process... Calling it on untrusted data is thus not recommended."*
    > Source: docs.python.org/3/library/ast.html#ast.literal_eval

## 6.2 Command Injection and Subprocess Invocation

4.  **MUST** When calling interfaces such as `subprocess.run()`/`Popen()`, it is **prohibited** to directly concatenate strings containing external input as a command under `shell=True`; `subprocess` by default (`shell=False`) does not invoke a system shell and can safely pass arguments containing shell metacharacters (passed as a list). When `shell=True` is genuinely required, the application itself is responsible for escaping all whitespace and metacharacters; the official recommendation is to use `shlex.quote()`.
    Positive example:
    ```python
    subprocess.run(['ls', '-l', user_supplied_path])   # 列表传参，无需转义，不经过shell
    ```
    Negative example:
    ```python
    subprocess.run(f'ls -l {user_supplied_path}', shell=True)   # 命令注入风险
    ```
    > Original text: *"Unlike some other popen functions, this library will not implicitly choose to call a system shell... If the shell is invoked explicitly, via `shell=True`, it is the application's responsibility to ensure that all whitespace and metacharacters are quoted appropriately to avoid shell injection vulnerabilities. On some platforms, it is possible to use `shlex.quote()` for this escaping."*
    > Source: docs.python.org/3/library/subprocess.html § Security Considerations

## 6.3 Cryptographic Random Numbers

5.  **MUST** When generating passwords, account authentication tokens, or security-related random strings/numbers, the `secrets` module must be used; using the `random` module is prohibited. The `random` module's pseudo-random number generator is designed for modeling and simulation scenarios and does not possess cryptographic security; its internal state may be predicted or recovered.
    Positive example: `token = secrets.token_urlsafe(32)`
    Negative example: `token = str(random.random())`
    > Original text: *"The secrets module is used for generating cryptographically strong random numbers suitable for managing data such as passwords, account authentication, security tokens, and related secrets... secrets should be used in preference to the default pseudo-random number generator in the random module, which is designed for modelling and simulation, not security or cryptography."*
    > Source: docs.python.org/3/library/secrets.html

## 6.4 Temporary Files

6.  **MUST** Creating temporary files must not use the deprecated `tempfile.mktemp()` (deprecated since Python 2.3); `tempfile.mkstemp()` or the higher-level `tempfile.TemporaryFile()`/`tempfile.NamedTemporaryFile()` must be used. `mktemp()` only generates a file name and does not atomically create the file; there is a race window (TOCTOU) between "generating the file name" and "creating the file", which can be exploited by another process that pre-creates a file with the same name, thereby introducing a security vulnerability.
    > Original text: *"Use of this function may introduce a security hole in your program. By the time you get around to doing anything with the file name it returns, someone else may have beaten you to the punch."*
    > Source: docs.python.org/3/library/tempfile.html § Deprecated functions and variables
    >
    > Original text (security of `mkstemp`): *"Creates a temporary file in the most secure manner possible. There are no race conditions in the file's creation..."*
    > Source: docs.python.org/3/library/tempfile.html

## 6.5 Hash Algorithm Selection

7.  **MUST** It is prohibited to use MD5 or SHA1 for any security-related scenario (password storage, signing, tamper-proof verification, etc.); the official documentation explicitly warns that these two algorithms have known collision attack weaknesses. Password storage must use dedicated password hashing algorithms (such as `hashlib.scrypt`, `bcrypt`, `argon2`). Ordinary data integrity verification (non-security scenarios) may continue to use MD5/SHA1, but must explicitly pass `usedforsecurity=False` (Python 3.9+) to clearly express the intent of "non-security use here".
    > Original text: *"Warning: Some algorithms have known hash collision weaknesses (including MD5 and SHA1)."*
    > Source: docs.python.org/3/library/hashlib.html § Hash algorithms
    >
    > Original text (`usedforsecurity` parameter): *"All hashlib constructors take a keyword-only argument `usedforsecurity` with default value `True`. A false value allows the use of insecure and blocked hashing algorithms... `False` indicates that the hashing algorithm is not used in a security context."*
    > Source: docs.python.org/3/library/hashlib.html

## 6.6 User Input and Permissions (General Engineering Practice)

8.  **MUST** All external input received through external interfaces (HTTP interfaces, RPC interfaces, command-line argument parsing, etc.) must undergo validity validation (type, length, value range, format) before being used in subsequent logic (database queries, file path concatenation, regex matching, redirected target URLs, etc.). Neglecting validation may lead to: excessive pagination parameters causing memory bloat, malicious `order by` causing slow database queries, path traversal reading unauthorized files, SSRF (Server-Side Request Forgery), arbitrary redirects, regex denial of service (ReDoS), and other issues.
    > Basis: community practice (such cross-language general input validation security principles equally apply to Python; specific detection methods should be combined with the official security documentation of the Web framework used by the project, such as the respective Security documentation of Django/Flask/FastAPI)

9.  **MUST** Use parameterized queries (e.g., DB-API 2.0 specification's `cursor.execute(sql, params)` placeholders) to access the database; embedding external input directly into SQL statements via string concatenation/formatting is prohibited, to prevent SQL injection.
    Positive example:
    ```python
    cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))
    ```
    Negative example:
    ```python
    cursor.execute(f'SELECT * FROM users WHERE id = {user_id}')
    ```
    > Basis: SQL injection prevention itself is a general database security practice (a best practice recognized by security organizations such as OWASP), not a security statement from the Python official documentation. The **interface format** for parameterized queries in Python is defined by PEP 249 (DB-API 2.0) `paramstyle`—original text: *"paramstyle -- String constant stating the type of parameter marker formatting expected by the interface. Possible values are: qmark, numeric, named, format, pyformat."* (Source: https://peps.python.org/pep-0249/#paramstyle). **Audit correction**: PEP 249 has been verified to not contain the words "security"/"injection" anywhere in its full text; it only defines the API format specification for parameter placeholders, and does not itself constitute a security basis for "SQL injection prevention"; the previous wording could easily lead readers to believe that PEP 249 officially endorses the security claim of injection prevention. This has now been corrected to "the interface format comes from PEP 249, the security motivation comes from general database security practice"—the two are stated separately to avoid over-association.

10. **MUST** When displaying user personal data, sensitive fields (phone numbers, ID numbers, bank card numbers, etc.) must be masked according to business security policy before being output to logs, API responses, or front-end pages, to avoid privacy leakage; interfaces involving cross-user data access must perform proper horizontal privilege checks.
    > Basis: community practice / general data security common sense (this rule is independent of the specific programming language; it is an organizational-level data security compliance requirement, and should be executed in conjunction with the data security policy of the organization)
