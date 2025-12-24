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
      const result = execSync(`linear issue show ${issueId} --format json 2>/dev/null`, {
        encoding: 'utf-8',
        timeout: 30000,
      });

      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return 'No JSON output from linear CLI';
      }

      const data = JSON.parse(jsonMatch[0]);

      const lines = [];
      if (data.title) lines.push(`Title: ${data.title}`);
      if (data.state?.name) lines.push(`State: ${data.state.name}`);
      if (data.priority) lines.push(`Priority: ${data.priority}`);
      if (data.assignee) lines.push(`Assignee: ${data.assignee}`);
      if (data.labels?.length) {
        const labelNames = data.labels.map((l) => (typeof l === 'string' ? l : l.name)).filter(Boolean);
        if (labelNames.length) lines.push(`Labels: ${labelNames.join(', ')}`);
      }
      if (data.description) lines.push(`\nDescription:\n${data.description}`);

      if (data.comments?.length) {
        lines.push(`\n--- Comments (${data.comments.length}) ---`);
        for (const comment of data.comments) {
          const author = comment.user?.name || comment.user?.email || 'unknown';
          const date = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : '';
          const body = comment.body || '';
          lines.push(`\n@${author} (${date}):\n${body}`);
        }
      }

      return lines.join('\n') || 'No issue details available';
    } catch (error) {
      if (error.message?.includes('not found')) {
        return 'Issue not found or not accessible';
      }
      return `Error fetching Linear issue: ${error.message}`;
    }
  },
};
