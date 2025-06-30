import { Container, Typography, Box, Paper, Divider } from '@mui/material'

export default function PrivacyPolicyPage() {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          プライバシーポリシー
        </Typography>
        
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
          最終更新日: 2025年7月1日
        </Typography>

        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            📋 簡潔版 - 個人情報の取り扱い
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Tail Matchは個人情報をほとんど収集しない情報提供サービスです</strong>
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 2 }}>
            <Box>
              <Typography variant="subtitle1" color="error" gutterBottom>
                ❌ 収集していない情報
              </Typography>
              <Typography component="div" variant="body2">
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>お名前・住所・電話番号</li>
                  <li>メールアドレス</li>
                  <li>ユーザー登録情報</li>
                  <li>決済・クレジットカード情報</li>
                  <li>位置情報（GPS等）</li>
                  <li>写真・動画</li>
                  <li>SNSアカウント情報</li>
                </ul>
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle1" color="success.main" gutterBottom>
                ✅ 最小限の収集情報
              </Typography>
              <Typography component="div" variant="body2">
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>IPアドレス（アクセスログ）</li>
                  <li>ブラウザ情報（動作確認用）</li>
                  <li>お気に入り地域設定（ローカル保存）</li>
                  <li>閲覧ページ（サイト改善用）</li>
                </ul>
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="body2" sx={{ mt: 2, fontWeight: 'medium' }}>
            💡 ユーザー登録不要・個人特定不可・保護猫情報の閲覧のみのシンプルなサービスです
          </Typography>
        </Alert>

        <Divider sx={{ mb: 4 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            1. 基本方針
          </Typography>
          <Typography variant="body1" paragraph>
            Tail Match（以下「当サービス」）は、保護猫の命を救うことを目的としたマッチングサービスです。
            利用者の個人情報保護を重要な責務と考え、個人情報保護法をはじめとする関連法令を遵守し、
            適切な取り扱いに努めます。
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            2. 収集する情報
          </Typography>
          
          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            2.1 自動収集情報
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>IPアドレス</li>
              <li>ブラウザの種類・バージョン</li>
              <li>アクセス日時</li>
              <li>閲覧ページ</li>
              <li>リファラー情報</li>
              <li>デバイス情報（OS、画面解像度等）</li>
            </ul>
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            2.2 Cookieとローカルストレージ
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスでは、サービス向上のため以下の技術を使用します：
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>設定の保存（お気に入り地域、表示形式等）</li>
              <li>アクセス解析</li>
              <li>サービス改善のための統計分析</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            3. 情報の利用目的
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>保護猫情報の表示・検索機能の提供</li>
              <li>サービスの維持・運営・改善</li>
              <li>システムの安定性確保</li>
              <li>不正利用の防止</li>
              <li>統計分析（個人を特定しない形での利用）</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            4. 第三者提供
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスは、以下の場合を除き、利用者の個人情報を第三者に提供いたしません：
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>利用者の事前の同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要がある場合</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            5. データの保護
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスは、収集した情報を適切に管理し、以下の措置を講じます：
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>SSL/TLS暗号化通信</li>
              <li>アクセス制限・認証システム</li>
              <li>定期的なセキュリティ監査</li>
              <li>不要となったデータの適切な削除</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            6. 外部サービス
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスでは以下の外部サービスを利用しており、各サービスの
            プライバシーポリシーが適用されます：
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>Google Analytics（アクセス解析）</li>
              <li>各自治体の保護猫情報サイト（情報収集）</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            7. 免責事項
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスは保護猫情報の提供を目的としており、各自治体から
            自動収集した情報を表示しています。情報の正確性、完全性、
            最新性について保証するものではありません。
          </Typography>
          <Typography variant="body1" paragraph>
            保護猫の引き取りに関しては、必ず各自治体に直接お問い合わせください。
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            8. ポリシーの変更
          </Typography>
          <Typography variant="body1" paragraph>
            当プライバシーポリシーは、法令の変更やサービス改善に伴い
            変更する場合があります。重要な変更がある場合は、
            サイト上で事前に通知いたします。
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            9. お問い合わせ
          </Typography>
          <Typography variant="body1" paragraph>
            プライバシーポリシーに関するお問い合わせは、
            以下までご連絡ください：
          </Typography>
          <Typography variant="body1">
            <strong>Tail Match運営</strong><br />
            ウェブサイト: https://tail-match.llll-ll.com<br />
            GitHub: https://github.com/kako-jun/tail-match
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />
        
        <Typography variant="body2" color="text.secondary" align="center">
          🐾 すべては保護猫の命を救うために
        </Typography>
      </Paper>
    </Container>
  )
}