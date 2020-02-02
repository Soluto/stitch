## Running locally

Use the Tiltfile/docker-compose.yml located in `deployment/dev` to get a local env running quickly

## CI & Versioning

-   Tests run on all pull requests
-   When merging to master, CI will publish soluto/stitch:\$commit_sha and soluto/stitch:latest
-   When pushing a version tag to the repo, CI will pick it up and create a docker image from the tagged commit tagged as the git tag. I.E. pushing v7.0 tag will create soluto/stitch:v7.0
