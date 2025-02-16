# CONTRIBUTING.md

Thank you for your interest in contributing to **WhatsApp Dashboard**! This project is an open-source React application that enables users to analyze and visualize WhatsApp chat data securely and privately. We welcome all contributions—whether you want to fix a bug, propose a new feature, or improve our documentation.

## Table of Contents

- [Project Overview](#project-overview)
- [Getting Started](#getting-started)
- [Opening Issues](#opening-issues)
- [Submitting Changes (Pull Requests)](#submitting-changes-pull-requests)
- [Code Style and Formatting](#code-style-and-formatting)
- [Testing](#testing)
- [Review Process](#review-process)
- [License](#license)
- [Contact](#contact)

---

## Project Overview

**WhatsApp Dashboard** is a React-based web application that processes `.txt` files exported from WhatsApp. Users can visualize, analyze, and explore their chat data locally, with no data sent to external servers.

## Getting Started

1. **Fork the Repository**  
   Click the "Fork" button at the top right of this repository and clone it locally.

2. **Install Dependencies**

   ```
   npm install
   ```

3. **Run the App**
   ```
   npm run dev
   ```
   Visit the URL shown in your terminal (e.g., `http://localhost:5173`) to see the app in action.

## Opening Issues

- Anyone can open an [Issue](../../issues) to report a bug, request a feature, or ask a question.
- Please provide as much information as possible in your Issue—steps to reproduce, screenshots, or logs (if relevant).

## Submitting Changes (Pull Requests)

1. **Create a Branch**

   - Branch off `master` with a descriptive name, for example:
     ```
     git checkout -b feature/add-new-plot
     ```

2. **Commit Your Changes**

   - Make sure your commit messages are clear and descriptive.

3. **Open a Pull Request (PR)**

   - Push your branch to your fork and open a Pull Request targeting the `master` branch.
   - Fill in the PR template if provided.

4. **Wait for Automated Tests**

   - Our CI runs tests automatically via `npm run test`. Ensure your changes pass these tests.

5. **Discuss and Resolve Feedback**
   - Be responsive to questions or comments. We may suggest changes before merging.

## Code Style and Formatting

- We use **Prettier** for code formatting, defined in [`.prettierrc`](./.prettierrc).
- Please **run** the following command before opening a PR to fix formatting automatically:
  ```
  npm run lint
  ```
  or
  ```
  npx prettier --write .
  ```
- We also use **ESLint**. Address any lint errors or warnings before submitting your PR.

## Testing

- We use **Vitest** for testing.
- Make sure that all tests pass by running:
  ```
  npm run test
  ```
- New features or bug fixes should include relevant test coverage whenever possible.

## Review Process

- Pull Requests can only be reviewed (and ultimately merged) by project maintainers.
- Currently, only the lead maintainer (@frievoe97) handles reviews.
- Once your PR is approved and tests pass, it can be merged into `master`.

## License

This project is licensed under the [MIT License](./LICENSE.txt), with an additional requirement to credit the author in any publicly distributed versions of the software.

## Contact

- For any questions, suggestions, or discussions, please open a [GitHub Issue](../../issues).
- We primarily use GitHub Issues for communication and will do our best to respond promptly.

Thank you for contributing to **WhatsApp Dashboard**—your support and interest make this project better!!!
