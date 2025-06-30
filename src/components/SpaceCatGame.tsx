'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, IconButton, Tooltip, Chip } from '@mui/material'

interface SpaceCatGameProps {
  size?: 'small' | 'medium'
}

export default function SpaceCatGame({ size = 'small' }: SpaceCatGameProps) {
  const [score, setScore] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showRainbow, setShowRainbow] = useState(false)
  const [milestone, setMilestone] = useState<string | null>(null)

  // LocalStorageからスコア読み込み
  useEffect(() => {
    const savedScore = localStorage.getItem('spaceCatScore')
    if (savedScore) {
      setScore(parseInt(savedScore))
    }
  }, [])

  // スコアをLocalStorageに保存
  useEffect(() => {
    localStorage.setItem('spaceCatScore', score.toString())
  }, [score])

  const handleCatClick = () => {
    setScore(prev => prev + 1)
    setIsAnimating(true)
    
    // アニメーション終了
    setTimeout(() => setIsAnimating(false), 600)
    
    // マイルストーン判定
    const newScore = score + 1
    if (newScore === 10) {
      setMilestone('🌟 宇宙デビュー！')
    } else if (newScore === 50) {
      setMilestone('🪐 惑星マスター！')
    } else if (newScore === 100) {
      setMilestone('🌙 月面到達！')
      setShowRainbow(true)
      setTimeout(() => setShowRainbow(false), 2000)
    } else if (newScore === 500) {
      setMilestone('🌌 銀河の守護者！')
      setShowRainbow(true)
      setTimeout(() => setShowRainbow(false), 3000)
    }
    
    // マイルストーン表示クリア
    if (milestone) {
      setTimeout(() => setMilestone(null), 3000)
    }
  }

  const getCatEmoji = () => {
    if (score < 10) return '🐱'
    if (score < 50) return '🚀🐱'
    if (score < 100) return '👨‍🚀🐱'
    if (score < 500) return '🌟👨‍🚀🐱'
    return '🌈👨‍🚀🐱✨'
  }

  const getTooltipText = () => {
    if (score === 0) return 'シッポたちを宇宙に送り出そう！'
    if (score < 10) return `${score}匹のシッポたちが宇宙へ！`
    if (score < 50) return `${score}匹が宇宙を冒険中！`
    if (score < 100) return `${score}匹の宇宙飛行士猫！`
    if (score < 500) return `${score}匹の銀河猫軍団！`
    return `${score}匹の虹宇宙猫！あなたは猫界のヒーロー！`
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 1,
      position: 'relative'
    }}>
      {/* マイルストーン表示 */}
      {milestone && (
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
            color: 'white',
            px: 2,
            py: 1,
            borderRadius: 2,
            fontSize: '0.75rem',
            fontWeight: 'bold',
            animation: 'bounce 0.6s ease-in-out',
            zIndex: 1000,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          {milestone}
        </Box>
      )}

      {/* 虹エフェクト */}
      {showRainbow && (
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            left: -20,
            right: -20,
            bottom: -20,
            background: 'linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #00ff00, #0080ff, #8000ff)',
            borderRadius: '50%',
            opacity: 0.3,
            animation: 'rainbow-pulse 1s ease-in-out infinite',
            zIndex: -1
          }}
        />
      )}

      <Tooltip title={getTooltipText()} arrow>
        <IconButton
          onClick={handleCatClick}
          sx={{
            fontSize: size === 'small' ? '1.5rem' : '2rem',
            transition: 'all 0.3s ease',
            transform: isAnimating ? 'scale(1.3) rotate(360deg)' : 'scale(1)',
            '&:hover': {
              transform: 'scale(1.1)',
              background: 'rgba(255, 182, 193, 0.1)'
            }
          }}
        >
          <span style={{ 
            filter: showRainbow ? 'hue-rotate(0deg)' : 'none',
            animation: showRainbow ? 'hue-rotation 2s infinite' : 'none'
          }}>
            {getCatEmoji()}
          </span>
        </IconButton>
      </Tooltip>

      {/* スコア表示 */}
      {score > 0 && (
        <Chip
          label={score}
          size="small"
          sx={{
            background: 'linear-gradient(45deg, #8B4513 30%, #FF8C00 90%)',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.75rem',
            height: size === 'small' ? 20 : 24
          }}
        />
      )}

      <style jsx global>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          40% {
            transform: translateX(-50%) translateY(-10px);
          }
          60% {
            transform: translateX(-50%) translateY(-5px);
          }
        }
        
        @keyframes rainbow-pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }
        
        @keyframes hue-rotation {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
      `}</style>
    </Box>
  )
}