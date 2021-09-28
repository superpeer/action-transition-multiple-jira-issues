# Jira Issue Transition Action

Find Jira issue keys from commit messages in pull requests and transition them

## Usage

```yaml
- name: Jira find and transition issues
  uses: superpeer/jira-issue-transition-action
  with:
    jira-base-url: https://<yourdomain>.atlassian.net
    jira-user-email: human@example.com
    jira-api-token: ${{ secrets.JIRA_API_TOKEN }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    target-status: In Progress
    issue-prefixes: BB, P1
    ignore-statuses: Done, QA
```

## Inputs

| **Name**        | **Description**                                                           | **Required** |
| --------------- | ------------------------------------------------------------------------- | ------------ |
| jira-base-url   | URL of Jira instance                                                      | ✔            |
| jira-api-token  | Access Token for Authorization                                            | ✔            |
| jira-user-email | Email of the user for which Access Token was created for                  | ✔            |
| github-token    | Your everyday GitHub token                                                | ✔            |
| issue-prefixes  | Comma separated list of the prefixes to scan                              | ✔            |
| target-status   | To which status the issues found in the pull request should transition to | ✔            |
| ignore-statuses | Comma separated list of statuses to ignore                                | ❌           |

## References

- [chontawee/gj-find-transition-issues](https://github.com/chontawee/gj-find-transition-issues)
- [atlassian/gajira-login](https://github.com/atlassian/gajira-login.git)
- [atlassian/gajira-find-issue-key](https://github.com/atlassian/gajira-find-issue-key.git)
- [atlassian/gajira-transition](https://github.com/atlassian/gajira-transition.git)
