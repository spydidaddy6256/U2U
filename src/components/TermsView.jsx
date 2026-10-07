import React from 'react';
import { ArrowLeft, Shield, FileText } from 'lucide-react';

export default function TermsView({ onBack }) {
  return (
    <div className="legal-page-container">
      <div className="legal-header">
        <button className="btn btn-ghost" onClick={onBack} style={{ gap: 6, padding: '6px 12px' }}>
          <ArrowLeft size={16} />
          <span>Back to U2U</span>
        </button>
      </div>

      <div className="legal-content">
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="brand-dots-icon" style={{ marginBottom: 16 }}>
            <div className="brand-dot" />
            <div className="brand-line" style={{ width: 20 }} />
            <div className="brand-dot" />
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
            U2U Terms & Conditions
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', fontWeight: 500 }}>
            Please read before using U2U.
          </p>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
            Last updated: October 2, 2026
          </div>
        </div>

        <div className="legal-section">
          <h2>1. Age Requirement</h2>
          <p>
            U2U is intended only for people who are <strong>18 years of age or older</strong>. By using U2U, you confirm that you meet the applicable minimum age requirement. If you are under 18, do not use U2U. If local law requires a different minimum age or additional requirements, those legal requirements apply.
          </p>
        </div>

        <div className="legal-section">
          <h2>2. Parent or Guardian Permission</h2>
          <p>
            If you are under the applicable age required to use the service in your jurisdiction, you must not use U2U unless permitted by applicable law and with any required parent or legal guardian consent. For the product's intended audience, U2U strictly requires users to be 18+. Do not encourage minors to bypass age restrictions.
          </p>
        </div>

        <div className="legal-section">
          <h2>3. Lawful Use Only</h2>
          <p>
            You agree to use U2U only for lawful purposes. You must not use U2U to commit crimes, plan criminal activity, facilitate violence, distribute prohibited material, facilitate fraud, facilitate unauthorized access, facilitate harassment, facilitate exploitation, violate applicable laws, or assist another person in unlawful activity. U2U does not authorize or encourage illegal activity.
          </p>
        </div>

        <div className="legal-section">
          <h2>4. No Promotion of Illegal or Unauthorized Activity</h2>
          <p>
            U2U does not promote, encourage, instruct, or endorse illegal or unauthorized activities. The existence of encrypted communication does not constitute permission to use the service unlawfully. Users remain responsible for their own actions and compliance with applicable laws.
          </p>
        </div>

        <div className="legal-section">
          <h2>5. User Responsibility</h2>
          <p>
            You are solely responsible for what you send, what you receive, how you use the service, the people you communicate with, and complying with all applicable local, national, and international laws. U2U is a communication tool and does not control or endorse the content users exchange.
          </p>
        </div>

        <div className="legal-section">
          <h2>6. User Content</h2>
          <p>
            U2U does not endorse, approve, or adopt content exchanged between users. Messages, images, and other material exchanged through a private session are created and transmitted solely by users. Users are responsible for ensuring that their use of the service and the material they transmit is lawful.
          </p>
        </div>

        <div className="legal-section">
          <h2>7. Privacy Limitations</h2>
          <p>
            U2U is designed with privacy and end-to-end encryption in mind. However, no online service can guarantee absolute security or privacy. Users should understand that their own device may be compromised, another participant may copy content, screenshots may be possible, someone may photograph a screen, browser or operating-system vulnerabilities may exist, network/infrastructure metadata may exist, or third-party device environments may introduce risks.
          </p>
        </div>

        <div className="legal-section">
          <h2>8. Screen Capture</h2>
          <p>
            U2U may implement reasonable technical measures (such as Screen Privacy shields) to reduce casual copying or screen viewing. However, U2U cannot guarantee that screenshots, screen recordings, external cameras, or other forms of copying are impossible. Users should never assume that content displayed on another person's device can be completely controlled.
          </p>
        </div>

        <div className="legal-section">
          <h2>9. Temporary Data</h2>
          <p>
            U2U is designed around temporary sessions. Sessions are subject to automatic 24-hour expiration. Temporary encrypted files, including photos, are subject to deletion according to the application's expiration and deletion rules (including 30-second post-open timers). Users must not treat U2U as permanent storage.
          </p>
        </div>

        <div className="legal-section">
          <h2>10. Deletion Limitations</h2>
          <p>
            U2U may delete data from systems under its control according to its technical deletion mechanisms. However, deletion from U2U does not guarantee deletion of screenshots, screen recordings, downloaded copies, photographs of screens, content stored on a participant's device, backups outside U2U, or content copied elsewhere.
          </p>
        </div>

        <div className="legal-section">
          <h2>11. Third-Party Services</h2>
          <p>
            If U2U uses third-party infrastructure or hosting services, those providers may have their own terms, policies, technical limitations, and processing practices. U2U minimizes third-party services and avoids unnecessary third-party tracking.
          </p>
        </div>

        <div className="legal-section">
          <h2>12. Availability</h2>
          <p>
            U2U may not always be available. The service may experience maintenance, outages, network failures, browser compatibility problems, infrastructure failures, security incidents, or unexpected technical issues. U2U does not guarantee uninterrupted or error-free operation.
          </p>
        </div>

        <div className="legal-section">
          <h2>13. No Permanent Account</h2>
          <p>
            U2U does not require traditional user accounts for normal session use. Session credentials are temporary and should be treated as sensitive. Anyone who obtains valid session credentials may potentially gain access to the associated session, depending on participant limits. Users must protect their Session ID and Passcode.
          </p>
        </div>

        <div className="legal-section">
          <h2>14. Session Credentials</h2>
          <p>
            Users should only share their Session ID and Passcode with the intended participant. Do not publish session credentials publicly. Do not send them to unknown people. If you believe your credentials have been exposed, burn the session immediately and create a new one.
          </p>
        </div>

        <div className="legal-section">
          <h2>15. Abuse of the Service</h2>
          <p>
            Do not use U2U to attack the service, overload infrastructure, bypass security controls, brute-force sessions, exploit vulnerabilities, interfere with another user's session, reverse engineer security mechanisms for malicious purposes, distribute malware, or automate abusive traffic. Security researchers should use responsible disclosure channels.
          </p>
        </div>

        <div className="legal-section">
          <h2>16. No Warranty</h2>
          <p>
            To the extent permitted by applicable law, U2U is provided on an "as available" and "as is" basis without guarantees that the service will always be secure, uninterrupted, or error-free. Nothing in these Terms is intended to exclude rights or protections that cannot legally be excluded under applicable law.
          </p>
        </div>

        <div className="legal-section">
          <h2>17. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, U2U and its operators shall not be responsible for losses arising from circumstances outside reasonable control, including user misuse, compromised devices, screenshots, copies made by participants, internet failures, third-party infrastructure failures, unauthorized access caused by credential sharing, illegal activity performed by users, or technical failures beyond reasonable control.
          </p>
        </div>

        <div className="legal-section">
          <h2>18. Indemnification</h2>
          <p>
            Where legally permitted, users agree to hold harmless and indemnify U2U and its operators from and against claims, damages, liabilities, and expenses arising from their unlawful use of the service or violation of these Terms.
          </p>
        </div>

        <div className="legal-section">
          <h2>19. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with <strong>[Insert applicable jurisdiction after legal review]</strong>, without regard to its conflict of law principles.
          </p>
        </div>

        <div className="legal-section">
          <h2>20. Changes to These Terms</h2>
          <p>
            U2U may update these Terms when necessary. If material changes are made, an appropriate notice will be displayed within the application. Your continued use of the service constitutes acceptance of updated terms.
          </p>
        </div>

        <div className="legal-section">
          <h2>21. Contact</h2>
          <p>
            For official inquiries or security disclosures, please contact: <strong>[Insert official support/legal contact]</strong>.
          </p>
        </div>

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <button className="btn btn-primary" onClick={onBack} style={{ height: 44, padding: '0 28px' }}>
            I Understand & Return to U2U
          </button>
        </div>
      </div>
    </div>
  );
}
