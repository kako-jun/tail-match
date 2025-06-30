import { Container, Typography, Box, Paper, Divider } from '@mui/material'

export default function TermsOfServicePage() {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          利用規約
        </Typography>
        
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
          最終更新日: 2025年7月1日
        </Typography>

        <Alert severity="success" sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            🐾 簡潔版 - サービス概要
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Tail Matchは保護猫の命を救うための無料情報提供サービスです</strong>
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 2 }}>
            <Box>
              <Typography variant="subtitle1" color="success.main" gutterBottom>
                ✅ このサービスでできること
              </Typography>
              <Typography component="div" variant="body2">
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>全国の保護猫情報を一括検索</li>
                  <li>地域・性別・年齢での絞り込み</li>
                  <li>緊急度（残り日数）の確認</li>
                  <li>各自治体の連絡先確認</li>
                  <li>完全無料での利用</li>
                </ul>
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle1" color="error" gutterBottom>
                ❌ このサービスでできないこと
              </Typography>
              <Typography component="div" variant="body2">
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>保護猫の譲渡手続き</li>
                  <li>各自治体への代理連絡</li>
                  <li>猫の健康状態保証</li>
                  <li>リアルタイム情報更新</li>
                  <li>商業的な猫販売</li>
                </ul>
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="body2" sx={{ mt: 2, fontWeight: 'medium', color: 'warning.main' }}>
            ⚠️ 重要: 保護猫の引き取りは必ず各自治体に直接ご連絡ください
          </Typography>
        </Alert>

        <Divider sx={{ mb: 4 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            1. サービス概要
          </Typography>
          <Typography variant="body1" paragraph>
            Tail Match（以下「当サービス」）は、日本全国の自治体が公開している
            保護猫情報を自動収集・集約し、一元的に検索・閲覧できるサービスです。
            保護猫の殺処分を防ぎ、一匹でも多くの命を救うことを目的としています。
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            2. 利用条件
          </Typography>
          
          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            2.1 基本原則
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスの利用者は、以下の基本原則に同意するものとします：
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>保護猫の福祉を最優先に考えること</li>
              <li>情報を適切な目的でのみ使用すること</li>
              <li>各自治体のルールを尊重すること</li>
              <li>他の利用者に配慮すること</li>
            </ul>
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            2.2 禁止事項
          </Typography>
          <Typography variant="body1" paragraph>
            以下の行為を禁止します：
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>商業目的での情報利用</li>
              <li>システムに過度な負荷をかける行為</li>
              <li>虚偽の情報を提供する行為</li>
              <li>他の利用者や第三者への迷惑行為</li>
              <li>法令に違反する行為</li>
              <li>当サービスの運営を妨害する行為</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            3. 情報の性質と免責
          </Typography>
          
          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            3.1 情報源
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスで提供される保護猫情報は、各自治体の公式ウェブサイトから
            自動収集したものです。当サービスは情報の仲介のみを行い、
            保護猫の譲渡手続きには関与いたしません。
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            3.2 情報の正確性
          </Typography>
          <Typography variant="body1" paragraph>
            自動収集システムの性質上、以下の点にご注意ください：
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>情報に遅延や差異が生じる場合があります</li>
              <li>既に譲渡済みの猫が表示される場合があります</li>
              <li>収集時点での情報のため、最新状況と異なる場合があります</li>
            </ul>
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>保護猫の引き取りを希望される場合は、必ず各自治体に直接確認してください。</strong>
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            3.3 免責事項
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスは以下について責任を負いません：
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>提供情報の正確性、完全性、最新性</li>
              <li>サービス利用による直接的・間接的損害</li>
              <li>自治体との譲渡手続きに関する問題</li>
              <li>システム障害やメンテナンスによる利用停止</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            4. 知的財産権
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスのシステム、デザイン、コンテンツ等の知的財産権は
            運営者に帰属します。ただし、保護猫の情報については各自治体に
            著作権等の権利が帰属します。
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            5. サービスの変更・停止
          </Typography>
          <Typography variant="body1" paragraph>
            運営者は、以下の場合にサービスの内容変更・一時停止・終了を
            行うことがあります：
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>システムメンテナンスのため</li>
              <li>法令変更への対応のため</li>
              <li>技術的問題の解決のため</li>
              <li>運営上の都合のため</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            6. 準拠法・管轄裁判所
          </Typography>
          <Typography variant="body1" paragraph>
            本規約は日本法に準拠し、当サービスに関する紛争については、
            運営者の本拠地を管轄する裁判所を専属的合意管轄とします。
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            7. 規約の変更
          </Typography>
          <Typography variant="body1" paragraph>
            本規約は、法令の変更やサービス改善に伴い変更する場合があります。
            重要な変更がある場合は、サイト上で事前に通知いたします。
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            8. お問い合わせ
          </Typography>
          <Typography variant="body1" paragraph>
            本規約に関するお問い合わせは、以下までご連絡ください：
          </Typography>
          <Typography variant="body1">
            <strong>Tail Match運営</strong><br />
            ウェブサイト: https://tail-match.llll-ll.com<br />
            GitHub: https://github.com/kako-jun/tail-match
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />
        
        <Typography variant="body2" color="text.secondary" align="center">
          🐾 保護猫の命を最優先に、皆様のご協力をお願いいたします
        </Typography>
      </Paper>
    </Container>
  )
}