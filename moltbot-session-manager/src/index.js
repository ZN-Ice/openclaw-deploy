#!/usr/bin/env node
/**
 * Clear all Moltbot sessions
 *
 * This script lists all active sessions using the moltbot CLI
 * and deletes them one by one.
 */

import { execSync } from 'child_process';
import fs from 'fs';

/**
 * Execute a shell command and return stdout
 * @param {string} command - Command to execute
 * @returns {string} Command output
 */
function exec(command) {
  try {
    return execSync(command, { encoding: 'utf-8' });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    throw error;
  }
}

/**
 * Main function to clear all sessions
 */
function clearAllSessions() {
  console.log('Fetching all session keys...');

  // Get all session keys as JSON
  const sessionsJson = exec('moltbot gateway call sessions.list --json');

  // Parse JSON and extract session keys
  let sessions;
  try {
    sessions = JSON.parse(sessionsJson);
  } catch (error) {
    console.error('Failed to parse sessions JSON:', error.message);
    console.error('Raw output:', sessionsJson);
    process.exit(1);
  }

  const sessionKeys = sessions.sessions?.map(s => s.key) || [];

  if (sessionKeys.length === 0) {
    console.log('No sessions found.');
    return;
  }

  console.log(`Found ${sessionKeys.length} session(s). Deleting...\n`);

  // Delete each session
  for (const sessionKey of sessionKeys) {
    console.log(`Deleting session: ${sessionKey}`);

    const params = JSON.stringify({ key: sessionKey });
    exec(`moltbot gateway call sessions.delete --params "${params}"`);

    console.log(`✓ Deleted: ${sessionKey}\n`);
  }

  console.log('All sessions deleted successfully!');
}

// Run the main function
clearAllSessions();
