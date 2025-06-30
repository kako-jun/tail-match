import { Container, Typography, Box, Paper, Divider, Alert } from '@mui/material'

export default function DisclaimerPage() {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          免責事項
        </Typography>
        
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
          最終更新日: 2025年7月1日
        </Typography>

        <Alert severity="warning" sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            🚨 簡潔版 - 重要な注意事項
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Tail Matchは情報提供のみ行う自動収集サービスです</strong>
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 2 }}>
            <Box>
              <Typography variant="subtitle1" color="warning.main" gutterBottom>
                ⚠️ 情報の制約
              </Typography>
              <Typography component="div" variant="body2">
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>自動収集のため情報に遅延あり</li>
                  <li>既に譲渡済みの猫も表示される</li>
                  <li>リアルタイム更新ではない</li>
                  <li>一部サイトは収集困難</li>
                </ul>
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle1" color="error" gutterBottom>
                🚫 当サービスでは責任を負わないこと
              </Typography>
              <Typography component="div" variant="body2">
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>情報の正確性・最新性</li>
                  <li>譲渡手続きの成否</li>
                  <li>システム障害による損失</li>
                  <li>自治体サイトの変更影響</li>
                </ul>
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="body1" sx={{ mt: 2, fontWeight: 'bold', color: 'error.main' }}>
            📞 必須: 保護猫の引き取りは必ず各自治体に直接確認してください
          </Typography>
        </Alert>

        <Divider sx={{ mb: 4 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            1. サービスの性質
          </Typography>
          <Typography variant="body1" paragraph>
            Tail Match（以下「当サービス」）は、全国の自治体が公開している
            保護猫情報を自動収集し、一元的に検索・閲覧できるようにする
            情報提供サービスです。
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスは保護猫の命を救うことを目的としていますが、
            情報の仲介のみを行い、保護猫の譲渡や引き取りに関する
            手続きには一切関与いたしません。
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            2. 情報の正確性について
          </Typography>
          
          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            2.1 自動収集システムの限界
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスで表示される情報は、各自治体のウェブサイトから
            自動収集したものです。以下の理由により、情報に遅延や
            差異が生じる場合があります：
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>自治体サイトの更新タイミングと収集タイミングのズレ</li>
              <li>技術的制約による収集の遅延や失敗</li>
              <li>自治体サイトの構造変更による情報取得の困難</li>
              <li>JavaScript等の動的コンテンツへの対応制限</li>
            </ul>
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            2.2 情報の更新頻度
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスは可能な限り最新の情報提供に努めていますが、
            リアルタイムでの更新は保証できません。特に以下の点にご注意ください：
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>既に譲渡決定済みの猫が表示される場合があります</li>
              <li>収容期限が過ぎている場合があります</li>
              <li>猫の健康状態や特徴が変更されている場合があります</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            3. 免責範囲
          </Typography>
          
          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            3.1 情報に関する免責
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスは以下について一切の責任を負いません：
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>提供情報の正確性、完全性、適時性</li>
              <li>情報の誤りや遅延による損害</li>
              <li>収集できなかった情報による機会損失</li>
              <li>自治体サイトの変更による情報取得の停止</li>
            </ul>
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            3.2 システムに関する免責
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>サーバー障害やメンテナンスによる利用停止</li>
              <li>通信環境による表示不具合</li>
              <li>ブラウザ互換性による動作問題</li>
              <li>外部サービス（自治体サイト等）の障害</li>
            </ul>
          </Typography>

          <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
            3.3 利用による損害
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスの利用に関連して生じる以下の損害について責任を負いません：
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li>直接的・間接的・特別・偶発的損害</li>
              <li>逸失利益や機会損失</li>
              <li>第三者からの損害賠償請求</li>
              <li>精神的苦痛</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            4. 推奨事項
          </Typography>
          <Typography variant="body1" paragraph>
            保護猫の引き取りを検討される場合は、以下の点を強く推奨いたします：
          </Typography>
          <Typography component="div" variant="body1">
            <ul>
              <li><strong>事前確認:</strong> 必ず該当自治体に直接連絡して最新状況を確認</li>
              <li><strong>複数確認:</strong> 電話とウェブサイトの両方で情報を確認</li>
              <li><strong>早めの連絡:</strong> 気になる猫がいる場合は迅速に自治体へ連絡</li>
              <li><strong>準備完了:</strong> 引き取り条件や必要書類を事前に確認</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            5. 第三者のウェブサイト
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスから各自治体のウェブサイトへのリンクを提供していますが、
            これらの第三者サイトの内容については責任を負いません。
            各サイトの利用規約やプライバシーポリシーをご確認ください。
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            6. 著作権
          </Typography>
          <Typography variant="body1" paragraph>
            表示される保護猫の写真や情報の著作権は各自治体に帰属します。
            当サービスは情報収集・表示の目的でのみ使用しており、
            商業利用や二次配布は行いません。
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            7. 変更・終了
          </Typography>
          <Typography variant="body1" paragraph>
            当サービスは予告なく内容の変更、一時停止、終了を行う場合があります。
            これらによる損害について責任を負いません。
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />
        
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body1">
            <strong>お願い:</strong> 当サービスは保護猫の命を救うという善意に基づいて運営されています。
            情報の制約をご理解いただき、各自治体への直接確認を必ず行ってください。
          </Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary" align="center">
          🐾 一匹でも多くの命を救うために、皆様のご理解とご協力をお願いいたします
        </Typography>
      </Paper>
    </Container>
  )
}