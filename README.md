# Tridex E-Commerce Platform

## Environment Variables and Security

### Setting Up Environment Variables

This project uses environment variables to manage sensitive credentials. Follow these steps to set up:

1. Copy `.env.example` to a new file named `.env`:
   ```
   cp .env.example .env
   ```

2. Edit the `.env` file and add your actual credentials:
   ```
   MONGODB_URI=your_actual_mongodb_connection_string
   CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
   CLOUDINARY_API_KEY=your_actual_api_key
   CLOUDINARY_API_SECRET=your_actual_api_secret
   ```

3. **IMPORTANT**: Never commit your `.env` file to Git. It's already in `.gitignore` to prevent accidental commits.

### Security Best Practices

- **Never use `git add .`** without first checking what files will be staged. Instead, use:
  ```
  git status
  ```
  to see what files would be added, then add specific files:
  ```
  git add file1.js file2.js
  ```

- **Always check your commits** before pushing:
  ```
  git diff --cached
  ```
  to see what changes are about to be committed.

- **Regularly rotate your API keys** for services like Cloudinary, especially after any suspected exposure.

- **Use the pre-commit hook** that's included in this repository to help prevent accidental commits of sensitive information.

## Installation and Setup

[Add your installation instructions here]

## Features

[Add your feature list here]

## License

[Add your license information here]
