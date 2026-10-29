import { ContentPage } from "./content-page"
export function TermsOfServicePage() {
  return (
    <ContentPage title="Terms of service" layout="article">
      <p>Effective date: October 14, 2026</p>
      <section>
        <h2>{"About these terms"}</h2>
        <p>
          {
            'SpawnKit ("we", "us") provides the website at spawnkit.cloud, developer accounts, the Spawn CLI and hosting services. These terms govern your use of those services. By creating an account or using the services, you agree to these terms. If you use SpawnKit for an organization, you must have authority to agree on its behalf. Contact us at '
          }
          <a href="mailto:hello@spawnkit.cloud" className="underline underline-offset-4">
            hello@spawnkit.cloud
          </a>
          {" with questions."}
        </p>
      </section>
      <section>
        <h2>{"Accounts and eligibility"}</h2>
        <p>
          {
            "You must be at least 13 years old, or the higher minimum age required where you live, and have the legal capacity or required permission to use the services. Provide accurate account information, keep access credentials secure and tell us if you believe your account has been compromised. You are responsible for activity you authorize through your account and for controlling access to connected repositories and deployments."
          }
        </p>
      </section>
      <section>
        <h2>{"Your games and content"}</h2>
        <p>
          {
            "You retain your rights in the games, source code, artwork and other content you provide. You give SpawnKit permission to store, copy, process and deliver that content only as needed to provide, maintain and protect the services you request. Public deployments make their served files available to visitors. Do not include secrets or private information in public assets."
          }
        </p>
        <p>
          {
            "You must have the rights and permissions needed for the content you upload or publish. Third-party engines, libraries, templates and assets remain subject to their respective licenses. Using SpawnKit does not replace those licenses or transfer another person's rights to you."
          }
        </p>
      </section>
      <section>
        <h2>{"Acceptable use"}</h2>
        <p>
          {
            "Use the services lawfully and respect other people's rights. Do not distribute malware, steal credentials, conduct fraud, unlawfully disclose personal information, infringe intellectual-property rights, exploit or endanger children, or use the service to harass or threaten people. Do not bypass access controls, interfere with other users or services, or evade published technical limits. Report suspected vulnerabilities privately instead of exploiting them or accessing another person's data."
          }
        </p>
      </section>
      <section>
        <h2>{"Your players and integrations"}</h2>
        <p>
          {
            "You are responsible for the games you operate, the information they collect and the third-party services you connect. Provide appropriate player notices, obtain required permissions and consents, and follow applicable rules for your audience. Our "
          }
          <a href="/privacy" className="underline underline-offset-4">
            privacy policy
          </a>
          {" describes SpawnKit's own handling of personal information."}
        </p>
        <p>
          {
            "Connected providers, including authentication services, code hosts and game libraries, have their own terms and policies. Authorizing an integration allows the access described in its consent flow. You can revoke an integration through the relevant provider, although doing so may prevent related features from working."
          }
        </p>
      </section>
      <section>
        <h2>{"Availability and charges"}</h2>
        <p>
          {
            "Features marked as previews, demonstrations or unavailable may be incomplete or change. Keep independent copies of source code and other important files. Unless we separately agree to a service-level commitment, we do not promise uninterrupted service, a particular level of performance or permanent availability of a feature or deployment."
          }
        </p>
        <p>
          {
            "Any paid service must disclose its price and applicable billing terms before you authorize a charge. Estimates or pricing examples alone do not create a paid subscription. Separate terms presented for a paid service apply to that service."
          }
        </p>
      </section>
      <section>
        <h2>{"Suspension and ending use"}</h2>
        <p>
          {
            "You may stop using SpawnKit and request account deletion through the contact address above. We may restrict access or remove content when reasonably necessary to address a breach of these terms, security threats, abuse or legal requirements. Where practical and lawful, we will explain the reason and allow an opportunity to resolve the issue. Immediate action may be necessary to protect people or the service."
          }
        </p>
        <p>
          {
            "Removing a deployment or ending an account may make hosted content unavailable. Information may remain where retention is necessary for security, legal obligations or other purposes described in our privacy policy. Ending use does not remove obligations that arose before termination or rights that must continue to resolve a dispute."
          }
        </p>
      </section>
      <section>
        <h2>{"Responsibility and legal rights"}</h2>
        <p>
          {
            "To the extent permitted by applicable law, the services are provided as available without additional warranties that they will be error-free or suitable for every purpose. We are not responsible for the content or independent practices of customer games or third-party services merely because they are accessible through SpawnKit. Nothing in these terms excludes liability, remedies or consumer rights that applicable law does not allow us to exclude."
          }
        </p>
      </section>
      <section>
        <h2>{"Changes and contact"}</h2>
        <p>
          {
            "We may update these terms as the service changes. We will publish the updated terms and effective date and provide notice of material changes or seek agreement where required. Contact "
          }
          <a href="mailto:hello@spawnkit.cloud" className="underline underline-offset-4">
            hello@spawnkit.cloud
          </a>
          {" about these terms, account requests or concerns about content hosted by SpawnKit."}
        </p>
      </section>
    </ContentPage>
  )
}
