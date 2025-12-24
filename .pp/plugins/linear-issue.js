const { execSync } = require('node:child_process');

const context = JSON.parse(process.env.PLUGIN_CONTEXT);
const linearLink = context.branchContext.linearLink;

if (!linearLink || linearLink === 'N/A' || linearLink.trim() === '') {
  const metadata = { isEmpty: true, description: 'No link' };
  console.log('No Linear link set\n');
  console.log(`<!-- SECTION_METADATA: ${JSON.stringify(metadata)} -->`);
  process.exit(0);
}

const issueMatch = linearLink.match(/linear\.app\/[^/]+\/issue\/([A-Z]+-\d+)/);
if (!issueMatch) {
  const metadata = { isEmpty: true, description: 'Invalid URL' };
  console.log('Invalid Linear URL format\n');
  console.log(`<!-- SECTION_METADATA: ${JSON.stringify(metadata)} -->`);
  process.exit(0);
}

const issueId = issueMatch[1];

try {
  const result = execSync(`linear issue show ${issueId} --format json 2>/dev/null`, {
    encoding: 'utf-8',
    timeout: 30000,
  });

  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.log('No JSON output from linear CLI');
    process.exit(0);
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

  const commentsCount = data.comments?.length || 0;
  if (commentsCount > 0) {
    lines.push(`\nComments (${commentsCount}):`);
    for (const comment of data.comments) {
      const author = comment.user?.name || comment.user?.email || 'unknown';
      const date = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : '';
      const body = comment.body || '';
      lines.push(`\n@${author} (${date}):\n${body}`);
    }
  }

  const state = data.state?.name || 'unknown';
  const description = `${state} · ${commentsCount} comments`;
  const metadata = {
    state,
    priority: data.priority || 'none',
    commentsCount,
    isEmpty: false,
    description,
  };

  console.log(`${lines.join('\n') || 'No issue details available'}\n`);
  console.log(`<!-- SECTION_METADATA: ${JSON.stringify(metadata)} -->`);
} catch (error) {
  const metadata = { isEmpty: true, description: 'Error' };
  if (error.message?.includes('not found')) {
    console.log('Issue not found or not accessible\n');
  } else {
    console.log(`Error fetching Linear issue: ${error.message}\n`);
  }
  console.log(`<!-- SECTION_METADATA: ${JSON.stringify(metadata)} -->`);
}
