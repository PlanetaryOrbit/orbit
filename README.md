>[!IMPORTANT]
>**Work-in-progress** - Planetary is currently in the process of updating this read me and creating our documentation for Orbit. We recommend you host for free with Planetary Cloud, however you can still self-host by following our <a href="https://docs.planetaryapp.us">Documentation</a>. Expect bugs in this beta. We've tried our best to iron out everything we could find in Tovy, but we expect there to be issues. Let us know by creating an issue, or if you're adventurous... patch it yourself and send in a PR.

>[!TIP]
> The best and easiest way to get started with Orbit is our cloud hosting solution, Planetary Cloud. It's easy, secure, and supafast. See https://planetaryapp.us to get started. The best part? It's **FREE**!
<div>
  <div align="left">
    <img height="40px" src=".github/logo.png"></img>
    <h1>Orbit by Team Planetary</h1>
  </div>
    <img src="https://img.shields.io/badge/version-v2.1.6beta21-purple"></img>
  <ul>
    <li><a href="#about">About</a></li>
    <li><a href="#why-consider">Why consider</a></li>
    <li><a href="#quicklinks">Quicklinks</a></li>
    <li><a href="#license">License</a></li>
  </ul>

  <h2>About</h2>
  <p>
    Orbit is a modern, improved, and maintained fork of the open source staff management platform, Tovy. It allows Roblox groups to manage their group members in a more intuitive and powerful way, while still being simple to use. Planetary aims to continue the original Tovy mission and maintain, improve, and introduce new features to Orbit. So far, we've fixed critical bugs that essentially bricked Tovy, improved the UI, and introduced image support to the wall. We also created our own custom runtime and cloud hosting service to bring Orbit to the masses for free, in just a few clicks.
  </p>
  <h2>Why consider</h2>
  <ul>
    <li>
      Beautifully-crafted and responsive frontend
    </li>
    <li>
      Packed with a lot of features, such as...
      <ul>
        <li>
          Creating custom roles and invite users or sync it to your group
        </li>
        <li>
          Bulk manage your group members
        </li>
        <li>
          Track your members' group activity
        </li>
        <li>
          Rank with Orbit Intergrations
        </li>
        <li>
          Warn, promote, demote, and way more to your members
        </li>
        <li>
          Communicate with your members directly in Orbit
        </li>
        <li>
          Host your docs with Orbit
        </li>
        <li>
          Assign your staff activity requirements
        </li>
        <li>
          Track when your members are inactive with notices
        </li>
        <li>
          Create and assign Policies for members to sign
        </li>
        <li>
          Host & Schedule sessions without causing a burden
        </li>
      </ul>
    </li>
    <li>
      Frontend written in TS with Nextjs & TailwindCSS, backend written in Typescript & Next.js
    </li>
    <li>
      Completely open source
    </li>
  </ul>

  <h2>Quicklinks</h2>
  <ul>
    <li>
      Don't know how to install? –– <a href="https://docs.planetaryapp.us">Visit our documentation!</a>
    </li>
    <li>
      🐛 Bugs? Need help? –– <a href="https://discord.gg/planetary">Get support and let us know here!</a>
    </li>
    <li>
      ✨ Updates –– <a href="https://changelog.planetaryapp.us/">View our Features and updates!</a>
    </li>
  </ul>

  <h2>🚀 One-Click Deploy</h2>
  <p>The fastest way to get started with Orbit is by deploying it to <strong>Vercel</strong> in just one click:</p>
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FPlanetaryOrbit%2Forbit&env=SESSION_SECRET,DATABASE_URL&build-command=prisma%20db%20push%20%26%26%20next%20build">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" />
  </a>
  <p><strong>Required environment variables:</strong></p>
  <ul>
    <li><code>SESSION_SECRET</code> – A strong secret string (e.g. generated via <code>openssl rand -base64 32</code>)</li>
    <li><code>DATABASE_URL</code> – Your connection string (e.g. hosted on Supabase, Railway, Neon, etc.)</li>
  </ul>

  <h2>License</h2>
  Orbit is licensed under the <a href="./LICENSE">GNU General Public License v3.0.</a>
</div>
