const { execSync } = require('node:child_process');

module.exports = {
  async fetch(context) {
    const linearLink = context.branchContext.linearLink;

    if (!linearLink || linearLink === 'N/A' || linearLink.trim() === '') {
      return 'No Linear link set';
    }

    const issueMatch = linearLink.match(/linear\.app\/[^/]+\/issue\/([A-Z]+-\d+)/);
    if (!issueMatch) {
      return 'Invalid Linear URL format';
    }

    const issueId = issueMatch[1];

    try {
      const result = execSync(`linear issue show ${issueId} --format json`, {
        encoding: 'utf-8',
        timeout: 30000,
      });

      const data = JSON.parse(result);

      const lines = [];
      if (data.title) lines.push(`Title: ${data.title}`);
      if (data.state) lines.push(`State: ${data.state}`);
      if (data.priority) lines.push(`Priority: ${data.priority}`);
      if (data.assignee) lines.push(`Assignee: ${data.assignee}`);
      if (data.labels?.length) lines.push(`Labels: ${data.labels.join(', ')}`);
      if (data.description) lines.push(`\nDescription:\n${data.description}`);

      return lines.join('\n') || 'No issue details available';
    } catch (error) {
      if (error.message?.includes('not found')) {
        return 'Issue not found or not accessible';
      }
      return `Error fetching Linear issue: ${error.message}`;
    }
  },
};
