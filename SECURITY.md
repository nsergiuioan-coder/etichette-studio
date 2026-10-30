# Security

Report bugs or suspected security problems through the [Issues page](https://github.com/nsergiuioan-coder/etichette-studio/issues). Do not attach private label data, passwords or access tokens to a public issue.

Use the installers published in this repository's Releases and compare their SHA-256 checksum with the supplied `SHA256SUMS.txt`. The source can also be built locally.

In-app updates are accepted only after the updater verifies their signature against the embedded public key. Signing keys and passwords must never be included in source commits, logs or issue reports. An updater signature does not certify a Windows Authenticode publisher.
