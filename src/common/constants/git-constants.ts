import { BASE_BRANCH } from './constants';

export const GIT_DIFF_BASE_BRANCH_NAME_STATUS = `git diff ${BASE_BRANCH}...HEAD --name-status`;
export const GIT_DIFF_BASE_BRANCH_NAME_ONLY = `git diff ${BASE_BRANCH}...HEAD --name-only`;
export const GIT_DIFF_BASE_BRANCH_NUMSTAT = `git diff ${BASE_BRANCH}...HEAD --numstat`;
export const GIT_DIFF_CACHED_NAME_STATUS = 'git diff --cached --name-status';
export const GIT_DIFF_CACHED_NAME_ONLY = 'git diff --cached --name-only';
export const GIT_DIFF_CACHED_NUMSTAT = 'git diff --cached --numstat';
export const GIT_DIFF_NAME_STATUS = 'git diff --name-status';
export const GIT_DIFF_NAME_ONLY = 'git diff --name-only';
export const GIT_DIFF_NUMSTAT = 'git diff --numstat';
export const GIT_REV_PARSE_HEAD = 'git rev-parse HEAD';
export const GIT_LOG_LAST_COMMIT_MESSAGE = 'git log -1 --pretty=%B';
