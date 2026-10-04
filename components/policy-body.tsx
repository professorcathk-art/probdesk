"use client";

import Link from "next/link";
import { LegalDocument } from "@/components/legal-document";
import { useLanguage } from "@/components/language-provider";

export function PolicyBody() {
  const { lang } = useLanguage();
  if (lang === "zh") return <ChineseTerms />;
  return <EnglishTerms />;
}

function ChineseTerms() {
  return (
    <LegalDocument title="條款與網站政策" updated="2026年10月4日" updatedLabel="更新日期">
      <p>
        使用 Vennode（<Link href="https://vennode.com">vennode.com</Link> 及相關服務）即表示你同意本條款和
        <Link href="/privacy">《隱私權政策》</Link>。
      </p>
      <h2>1. 服務是什麼</h2>
      <p>
        Vennode 讓人發布 1 對 1 或群組活動，並在雙方同意後才開啟聯絡。配對和建議只是工具，不保證你會找到人、被接受，或活動一定發生。
      </p>
      <h2>2. 誰可以使用</h2>
      <p>你必須達到當地法律允許自行訂立合約的年齡。你要為自己的帳號和帳號上的行為負責。</p>
      <h2>3. 你發布的內容</h2>
      <p>
        內容的權利仍屬於你。你授權 Vennode 在營運服務所需的範圍內托管、顯示和處理這些內容，包括配對、審核和安全。你必須有權發布這些內容。
      </p>
      <h2>4. 禁止的行為</h2>
      <p>你同意不會：</p>
      <ul>
        <li>發布或參與性相關活動，包括性服務、陪侍、色情約會，或任何以性行為為目的的帖和邀約；</li>
        <li>發布涉及未成年人的性或戀愛內容；</li>
        <li>騷擾、威脅、詐騙或洗版；</li>
        <li>發布違法或侵害他人權利的內容；</li>
        <li>繞過雙方同意或匿名保護；</li>
        <li>以具有實質誤導性的方式假裝身分或意圖。</li>
      </ul>
      <p>我們可以依適用法律，暫停或終止違反這些規則、或對社群造成風險的帳號。</p>
      <h2>5. 金額與線下結算</h2>
      <p>
        帖上可以寫申請人需要付款，或可以收到一筆錢，以及金額和貨幣。這只是成員之間的說明。
        <strong>所有款項都由雙方自行在線下或各自的管道結算。Vennode 不收款、不保管、不轉帳，也不代為結算。</strong>
      </p>
      <p>因此 Vennode 不是這筆款項的一方，也不負責：</p>
      <ul>
        <li>對方有沒有付款或收到錢；</li>
        <li>金額是否正確、是否退款、有沒有詐欺；</li>
        <li>你付費後得到的服務、活動或物品的品質；</li>
        <li>稅務，或這筆安排在你所在地是否合法。</li>
      </ul>
      <p>付款或收款之前，請自行確認對方身分和安排。因款項產生的爭議，由相關成員自行處理。</p>
      <h2>6. 見面與活動</h2>
      <p>
        聯絡開啟之後，你要為自己的互動負責。線下見面或參加活動時請自行判斷風險。Vennode 不對見面、活動的過程或結果負責，也不保證任何成員的身分、行為或承諾。
      </p>
      <h2>7. 免責與責任限制</h2>
      <p>
        在法律允許的最大範圍內，Vennode 依「現況」提供，不保證不中斷或沒有錯誤。對於因使用服務、線下結算、見面或活動所生的間接、附帶、特殊或衍生損害，Vennode 及其營運者不負責任。
      </p>
      <h2>8. 聯絡</h2>
      <p>
        條款問題請用 <Link href="/contact">聯絡我們</Link>。
      </p>
    </LegalDocument>
  );
}

function EnglishTerms() {
  return (
    <LegalDocument title="Terms of Service & Site Policy" updated="October 4, 2026">
      <p>
        These Terms govern your use of Vennode at <Link href="https://vennode.com">vennode.com</Link> and related
        services. By using Vennode, you agree to these Terms and our <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <h2>1. The service</h2>
      <p>
        Vennode lets people publish 1 to 1 posts and group activities, and opens contact only after both sides agree.
        Suggestions are tools. We do not guarantee that you will find someone, be accepted, or that an activity will
        happen.
      </p>
      <h2>2. Who can use it</h2>
      <p>
        You must be old enough to enter a contract where you live. You are responsible for your account and for what
        happens with it.
      </p>
      <h2>3. Your content</h2>
      <p>
        You keep the rights to what you post. You give Vennode a non-exclusive license to host, display, and process
        that content so we can run the service, including matching, moderation, and safety. You must have the right to
        post it.
      </p>
      <h2>4. What is not allowed</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Post or take part in sexual activities, including sexual services, escorting, pornographic meetups, or any post whose purpose is a sexual act;</li>
        <li>Post sexual or romantic content involving anyone under 18;</li>
        <li>Harass, threaten, defraud, or spam;</li>
        <li>Post anything illegal or that infringes someone else&apos;s rights;</li>
        <li>Bypass mutual-consent or anonymity protections;</li>
        <li>Misrepresent who you are or what you want in a materially deceptive way.</li>
      </ul>
      <p>We may suspend or close accounts that break these rules or put the community at risk, as the law allows.</p>
      <h2>5. Money is settled offline</h2>
      <p>
        A post may say that an applicant needs to pay, or can receive, a stated amount in a stated currency. That is
        only a note between members. <strong>All payment is settled offline, or through the members&apos; own channels. Vennode does not collect, hold, transfer, or settle that money.</strong>
      </p>
      <p>Vennode is not a party to the payment and is not responsible for:</p>
      <ul>
        <li>whether anyone pays or gets paid;</li>
        <li>whether the amount is right, refunded, or fraudulent;</li>
        <li>the quality of whatever was paid for;</li>
        <li>tax, or whether the arrangement is legal where you are.</li>
      </ul>
      <p>Check the other person and the arrangement yourself before you pay or accept money. Disputes about money are between the members involved.</p>
      <h2>6. Meetings and activities</h2>
      <p>
        After contact opens, you are responsible for your own interactions. Use your own judgment when you meet or join
        an activity. Vennode is not responsible for what happens at a meeting or activity, and does not guarantee any
        member&apos;s identity, conduct, or promises.
      </p>
      <h2>7. Disclaimers and liability</h2>
      <p>
        To the fullest extent the law allows, Vennode is provided as is. We do not promise uninterrupted or error-free
        operation. Vennode and its operators are not liable for indirect, incidental, special, or consequential damages
        arising from the service, offline payment, meetings, or activities.
      </p>
      <h2>8. Contact</h2>
      <p>
        Questions about these Terms: <Link href="/contact">contact us</Link>.
      </p>
    </LegalDocument>
  );
}
