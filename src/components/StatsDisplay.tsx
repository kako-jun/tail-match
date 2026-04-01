'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Box, Typography, Skeleton } from '@mui/material';
import { Favorite, Place, AccessTime, Warning } from '@mui/icons-material';

interface Stats {
  total: number;
  urgent: number;
  warning: number;
  caution: number;
  by_region: { region_name: string; count: string }[];
}

function StatCard({
  icon,
  value,
  label,
  sub,
  iconColor = '#262626',
  href,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub?: string;
  iconColor?: string;
  href?: string;
}) {
  const content = (
    <Box
      sx={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #DBDBDB',
        borderRadius: '8px',
        p: 3,
        textAlign: 'center',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        cursor: href ? 'pointer' : 'default',
        '&:hover': {
          borderColor: href ? '#262626' : '#A8A8A8',
          boxShadow: href ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
        },
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1.5,
          color: iconColor,
        }}
      >
        {icon}
      </Box>
      <Typography
        sx={{
          fontSize: '1.75rem',
          fontWeight: 300,
          color: '#262626',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          mb: 0.5,
        }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>
      <Typography sx={{ fontSize: '0.8125rem', color: '#8E8E8E', fontWeight: 400 }}>
        {label}
      </Typography>
      {sub && (
        <Typography
          sx={{
            fontSize: '0.6875rem',
            color: '#ED4956',
            fontWeight: 600,
            mt: 0.75,
            display: 'inline-block',
            px: 1.5,
            py: 0.25,
            backgroundColor: '#FFEEF0',
            borderRadius: '20px',
          }}
        >
          {sub}
        </Typography>
      )}
    </Box>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </Link>
    );
  }
  return content;
}

export default function StatsDisplay() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/tails?stats=true');
        const data = (await response.json()) as Record<string, any>;
        if (data.success && data.data) {
          setStats({ ...data.data, by_region: data.data.by_region || [] });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <Box
            key={i}
            sx={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #DBDBDB',
              borderRadius: '8px',
              p: 3,
              textAlign: 'center',
            }}
          >
            <Skeleton variant="circular" width={28} height={28} sx={{ mx: 'auto', mb: 1.5 }} />
            <Skeleton variant="text" width="50%" sx={{ mx: 'auto', mb: 0.5 }} />
            <Skeleton variant="text" width="70%" sx={{ mx: 'auto' }} />
          </Box>
        ))}
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
        }}
      >
        <StatCard
          icon={<Favorite sx={{ fontSize: 24 }} />}
          value="-"
          label="現在掲載中"
          iconColor="#FF7A7A"
        />
        <StatCard
          icon={<Place sx={{ fontSize: 24 }} />}
          value="-"
          label="連携自治体数"
          iconColor="#8E8E8E"
        />
        <StatCard
          icon={<Warning sx={{ fontSize: 24 }} />}
          value="-"
          label="緊急シッポ"
          iconColor="#ED4956"
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Main stats */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
        }}
      >
        <StatCard
          icon={<Favorite sx={{ fontSize: 24 }} />}
          value={stats.total}
          label="現在掲載中"
          iconColor="#FF7A7A"
          href="/search"
        />
        <StatCard
          icon={<AccessTime sx={{ fontSize: 24 }} />}
          value={stats.urgent}
          label="緊急シッポ"
          sub="残り3日以内"
          iconColor="#ED4956"
          href="/search?urgency_days=3&sort_by=deadline_date&sort_order=asc"
        />
        <StatCard
          icon={<Place sx={{ fontSize: 24 }} />}
          value={stats.by_region.length}
          label="連携地域数"
          iconColor="#8E8E8E"
          href="/shelters"
        />
        <StatCard
          icon={<Warning sx={{ fontSize: 24 }} />}
          value={stats.warning}
          label="要注意シッポ"
          sub="残り1週間以内"
          iconColor="#FFBA33"
          href="/search?urgency_days=7&sort_by=deadline_date&sort_order=asc"
        />
      </Box>

      {/* Urgent alert bar */}
      {(stats.urgent > 0 || stats.warning > 0) && (
        <Box
          sx={{
            border: '1px solid #FFBEC2',
            borderRadius: '8px',
            backgroundColor: '#FFEEF0',
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            flexWrap: 'wrap',
          }}
        >
          <Typography sx={{ fontSize: '0.875rem', color: '#ED4956', fontWeight: 600 }}>
            注意が必要なシッポが {stats.urgent + stats.warning} 匹います
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link
              href="/search?urgency_days=3&sort_by=deadline_date&sort_order=asc"
              style={{ textDecoration: 'none' }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: '20px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #FFBEC2',
                  transition: 'box-shadow 0.15s ease',
                  '&:hover': { boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
                }}
              >
                <Typography sx={{ fontSize: '0.75rem', color: '#ED4956', fontWeight: 600 }}>
                  緊急 {stats.urgent}匹
                </Typography>
              </Box>
            </Link>
            <Link
              href="/search?urgency_days=7&sort_by=deadline_date&sort_order=asc"
              style={{ textDecoration: 'none' }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: '20px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #FFE299',
                  transition: 'box-shadow 0.15s ease',
                  '&:hover': { boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
                }}
              >
                <Typography sx={{ fontSize: '0.75rem', color: '#B07D00', fontWeight: 600 }}>
                  要注意 {stats.warning}匹
                </Typography>
              </Box>
            </Link>
          </Box>
        </Box>
      )}

      {/* Region breakdown */}
      {stats.by_region.length > 0 && (
        <Box
          sx={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #DBDBDB',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 2,
              borderBottom: '1px solid #DBDBDB',
            }}
          >
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#262626' }}>
              地域別 シッポ分布
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 0,
            }}
          >
            {stats.by_region.map((region, index) => (
              <Link
                key={index}
                href={`/search?prefecture=${encodeURIComponent(region.region_name)}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Box
                  sx={{
                    p: 2.5,
                    textAlign: 'center',
                    borderRight: '1px solid #EFEFEF',
                    borderBottom: '1px solid #EFEFEF',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                    '&:hover': { backgroundColor: '#F0F0F0' },
                  }}
                >
                  <Typography
                    sx={{ fontSize: '1.125rem', fontWeight: 300, color: '#262626', lineHeight: 1 }}
                  >
                    {region.count}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#8E8E8E', mt: 0.5 }}>
                    {region.region_name}
                  </Typography>
                </Box>
              </Link>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
