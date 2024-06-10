import { useTranslation } from '@pancakeswap/localization'
import { BetPosition } from '@pancakeswap/prediction'
import { BlockIcon, Box, Card, CardBody } from '@pancakeswap/uikit'
import { formatBigInt } from '@pancakeswap/utils/formatBalance'
import useTheme from 'hooks/useTheme'
import { useMemo } from 'react'
import { getHasRoundFailed } from 'state/predictions/helpers'
import { useGetBufferSeconds } from 'state/predictions/hooks'
import { NodeLedger, NodeRound } from 'state/types'
import { styled } from 'styled-components'
import { getRoundPosition } from '../../../helpers'
import { RoundResult } from '../../RoundResult'
import CanceledRoundCard from '../CanceledRoundCard'
import CardHeader, { getBorderBackground } from '../CardHeader'
import CollectWinningsOverlay from '../CollectWinningsOverlay'
import MultiplierArrow from '../MultiplierArrow'
import { AICalculatingCard } from './AICalculatingCard'
import { BetBadgeStack } from './BetBadgeStack'

interface AIExpiredRoundCardProps {
  round: NodeRound
  betAmount?: NodeLedger['amount']
  hasEnteredUp: boolean
  hasEnteredDown: boolean
  hasClaimedUp: boolean
  hasClaimedDown: boolean
  formattedBullMultiplier: string
  formattedBearMultiplier: string
  isActive?: boolean
}

const StyledExpiredRoundCard = styled(Card)`
  opacity: 0.7;
  transition: opacity 300ms;

  &:hover {
    opacity: 1;
  }
`

export const AIExpiredRoundCard: React.FC<React.PropsWithChildren<AIExpiredRoundCardProps>> = ({
  round,
  betAmount,
  hasEnteredUp,
  hasEnteredDown,
  hasClaimedUp,
  hasClaimedDown,
  formattedBullMultiplier,
  formattedBearMultiplier,
  isActive,
}) => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { epoch, lockPrice, closePrice } = round
  const betPosition = getRoundPosition(lockPrice ?? 0n, closePrice ?? 0n)
  const bufferSeconds = useGetBufferSeconds()
  const hasRoundFailed = getHasRoundFailed(round.oracleCalled, round.closeTimestamp, bufferSeconds, round.closePrice)

  const aiPosition = useMemo(() => {
    if (!round.AIPrice || !round.lockPrice) return undefined

    const formattedLockPrice = +formatBigInt(round.lockPrice, 8, 8) // note: lock price formatted with 8 decimals
    const formattedAIPrice = +formatBigInt(round.AIPrice, 8, 18)

    return formattedAIPrice !== formattedLockPrice ? (formattedAIPrice > formattedLockPrice ? 'UP' : 'DOWN') : undefined
  }, [round.AIPrice, round.lockPrice])

  const userPosition = useMemo(() => {
    // hasEnteredUp => Following AI
    // hasEnteredDown => Against AI

    if ((hasEnteredUp && aiPosition === 'UP') || (hasEnteredDown && aiPosition === 'DOWN')) return 'UP'
    if ((hasEnteredUp && aiPosition === 'DOWN') || (hasEnteredDown && aiPosition === 'UP')) return 'DOWN'

    return undefined
  }, [aiPosition, hasEnteredUp, hasEnteredDown])

  // AI-based Prediction's Multiplier
  // If AI's prediction is UP, then BullMultiplier is AI's prediction and vice versa
  const bullMultiplier = aiPosition === 'UP' ? formattedBullMultiplier : formattedBearMultiplier
  const bearMultiplier = aiPosition === 'DOWN' ? formattedBullMultiplier : formattedBearMultiplier

  if (hasRoundFailed) {
    return <CanceledRoundCard round={round} />
  }

  if (!closePrice) {
    return <AICalculatingCard round={round} />
  }

  const cardProps = isActive
    ? {
        isActive,
      }
    : {
        borderBackground: getBorderBackground(theme, 'expired'),
      }

  return (
    <Box position="relative">
      <StyledExpiredRoundCard {...cardProps}>
        <CardHeader
          status="expired"
          icon={<BlockIcon mr="4px" width="21px" color="textDisabled" />}
          title={t('Expired')}
          epoch={round.epoch}
        />
        <CardBody p="16px" style={{ position: 'relative' }}>
          <BetBadgeStack aiBetType={aiPosition} userBetType={userPosition} />
          <MultiplierArrow
            betAmount={betAmount}
            multiplier={bullMultiplier}
            isActive={betPosition === BetPosition.BULL}
            hasClaimed={hasClaimedUp}
            isHouse={betPosition === BetPosition.HOUSE}
          />
          <RoundResult round={round} hasFailed={hasRoundFailed} />
          <MultiplierArrow
            betAmount={betAmount}
            multiplier={bearMultiplier}
            betPosition={BetPosition.BEAR}
            isActive={betPosition === BetPosition.BEAR}
            hasClaimed={hasClaimedDown}
            isHouse={betPosition === BetPosition.HOUSE}
          />
        </CardBody>
      </StyledExpiredRoundCard>
      <CollectWinningsOverlay epoch={epoch} isBottom={userPosition === 'DOWN'} />
    </Box>
  )
}
