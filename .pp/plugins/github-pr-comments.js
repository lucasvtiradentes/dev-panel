const { execSync } = require('node:child_process');

module.exports = {
  async fetch(context) {
    const prLink = context.branchContext.prLink;

    if (!prLink || prLink === 'N/A' || prLink.trim() === '') {
      return 'No PR link set';
    }

    const prMatch = prLink.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!prMatch) {
      return 'Invalid PR URL format';
    }

    const [, owner, repo, prNumber] = prMatch;

    try {
      const result = execSync(`gh pr view ${prNumber} --repo ${owner}/${repo} --comments --json comments`, {
        encoding: 'utf-8',
        timeout: 30000,
      });

      const data = JSON.parse(result);
      const comments = data.comments || [];

      if (comments.length === 0) {
        return 'No comments yet';
      }

      return comments
        .map((c) => {
          const date = new Date(c.createdAt).toLocaleDateString();
          const author = c.author?.login || 'unknown';
          const body = c.body || '';
          return `@${author} (${date}):\n${body}`;
        })
        .join('\n\n---\n\n');
    } catch (error) {
      if (error.message?.includes('Could not resolve')) {
        return 'PR not found or not accessible';
      }
      return `Error fetching PR comments: ${error.message}`;
    }
  },
};
