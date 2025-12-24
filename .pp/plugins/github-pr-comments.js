const { execSync } = require('node:child_process');

const context = JSON.parse(process.env.PLUGIN_CONTEXT);
const prLink = context.branchContext.prLink;
const options = context.sectionOptions || {};
const includeRegularComments = options.includeRegularComments !== false;
const includeReviewComments = options.includeReviewComments !== false;

if (!prLink || prLink === 'N/A' || prLink.trim() === '') {
  console.log('No PR link set');
  process.exit(0);
}

const prMatch = prLink.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
if (!prMatch) {
  console.log('Invalid PR URL format');
  process.exit(0);
}

const [, owner, repo, prNumber] = prMatch;
const output = [];
let prCommentsCount = 0;
let reviewCommentsCount = 0;

if (includeRegularComments) {
  try {
    const commentsResult = execSync(`gh pr view ${prNumber} --repo ${owner}/${repo} --json comments`, {
      encoding: 'utf-8',
      timeout: 30000,
    });

    const commentsData = JSON.parse(commentsResult);
    const comments = commentsData.comments || [];
    prCommentsCount = comments.length;

    if (comments.length > 0) {
      output.push(`--- PR Comments (${comments.length}) ---\n`);
      for (const c of comments) {
        const date = new Date(c.createdAt).toLocaleDateString();
        const author = c.author?.login || 'unknown';
        const body = c.body || '';
        output.push(`@${author} (${date}):\n${body}\n`);
      }
    }
  } catch (error) {
    output.push(`Error fetching PR comments: ${error.message}\n`);
  }
}

if (includeReviewComments) {
  try {
    const reviewsResult = execSync(`gh api repos/${owner}/${repo}/pulls/${prNumber}/comments`, {
      encoding: 'utf-8',
      timeout: 30000,
    });

    const reviewComments = JSON.parse(reviewsResult);
    reviewCommentsCount = reviewComments.length;

    if (reviewComments.length > 0) {
      output.push(`\n--- Code Review Comments (${reviewComments.length}) ---\n`);
      for (const c of reviewComments) {
        const date = new Date(c.created_at).toLocaleDateString();
        const author = c.user?.login || 'unknown';
        const body = c.body || '';
        const file = c.path || '';
        const line = c.line || c.original_line || '';
        output.push(`@${author} (${date}) [${file}:${line}]:\n${body}\n`);
      }
    }
  } catch (error) {
    output.push(`Error fetching review comments: ${error.message}\n`);
  }
}

const totalComments = prCommentsCount + reviewCommentsCount;
const metadata = { prCommentsCount, reviewCommentsCount, totalComments };

if (output.length === 0) {
  console.log('No comments yet');
  console.log(`<!-- SECTION_METADATA: ${JSON.stringify(metadata)} -->`);
} else {
  console.log(output.join('\n'));
  console.log(`<!-- SECTION_METADATA: ${JSON.stringify(metadata)} -->`);
}
