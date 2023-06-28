import { useEffect, useState } from 'react';
import classes from './Fork.module.css';
import { Trans } from '@lingui/macro';
import clsx from 'clsx';
import Section from '../../layout/Section';
import { Col, Container, Row, Spinner } from 'react-bootstrap';
import AddNounsToForkModal from '../../components/AddNounsToForkModal';
import ForkingPeriodTimer from '../../components/ForkingPeriodTimer';
import { Fork, useEscrowEvents, useForkDetails, useForkThreshold, useForks, useIsForkPeriodActive, useNumTokensInForkEscrow, useWithdrawFromForkEscrow } from '../../wrappers/nounsDao';
import { useEthers } from '@usedapp/core';
import { NounId, useTotalSupply, useUserEscrowedNounIds, useUserOwnedNounIds } from '../../wrappers/nounToken';
import ForkEvent from './ForkEvent';
import DeployForkButton from './DeployForkButton';
import WithdrawNounsButton from './WithdrawNounsButton';
import { useScrollToLocation } from '../../hooks/useScrollToLocation';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { buildEtherscanAddressLink } from '../../utils/etherscan';
import dayjs from 'dayjs';
import ForkDeployEvent from './ForkDeployEvent';
import NotFoundPage from '../NotFound';

const now = new Date();

const ForkPage = ({
  match: {
    params: { id },
  },
}: RouteComponentProps<{ id: string }>) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isThresholdMet, setIsThresholdMet] = useState(false);
  const [isForked, setIsForked] = useState(false);
  const [isForkPeriodActive, setIsForkPeriodActive] = useState(false);
  const [isNewForkPage, setIsNewForkPage] = useState(false);
  const [thresholdPercentage, setThresholdPercentage] = useState(0);
  const [currentEscrowPercentage, setCurrentEscrowPercentage] = useState(0);
  const [dataFetchPollInterval, setDataFetchPollInterval] = useState(0);
  const [forkStatusLabel, setForkStatusLabel] = useState('Escrow');
  const [addNounsButtonLabel, setAddNounsButtonLabel] = useState('Add Nouns to escrow');
  const [nounsInFork, setNounsInFork] = useState([0]);
  const [test, setTest] = useState<string[]>([]);
  // const isForkPeriodActive = useIsForkPeriodActive();
  const totalSupply = useTotalSupply();
  const forkThreshold = useForkThreshold();
  const numTokensInForkEscrow = useNumTokensInForkEscrow();
  const userEscrowedNounIds = useUserEscrowedNounIds(dataFetchPollInterval, id);
  const userOwnedNounIds = useUserOwnedNounIds(dataFetchPollInterval);
  const escrowEvents = useEscrowEvents(dataFetchPollInterval, id);
  const forkDetails = useForkDetails(dataFetchPollInterval, id || '');
  const forks = useForks(dataFetchPollInterval);
  const { account } = useEthers();
  const phantomListItems = new Array(4 - (forkDetails.data.addedNouns.length! % 4)).fill(0);
  console.log('escrowEvents', escrowEvents);

  useScrollToLocation();
  const refetchForkData = () => {
    userOwnedNounIds.refetch();
    userEscrowedNounIds.refetch();
    escrowEvents.refetch();
    forkDetails.refetch();
    forks.refetch();
  }

  useEffect(() => {
    // trigger data updates on modal close
    refetchForkData();
  }, [isModalOpen, isWithdrawModalOpen, isDeployModalOpen, isForkPeriodActive]);

  useEffect(() => {
    if (forkDetails?.data?.forkingPeriodEndTimestamp && +forkDetails.data.forkingPeriodEndTimestamp > now.getTime() / 1000) {
      // 'forking'
      setForkStatusLabel('Forking');
      setAddNounsButtonLabel('Join fork');
      setIsForkPeriodActive(true);
    } else if (forkDetails?.data?.forkingPeriodEndTimestamp && +forkDetails.data.forkingPeriodEndTimestamp < now.getTime() / 1000) {
      // 'forked' === executed and forking period ended
      setIsForked(true);
      setForkStatusLabel('Forked');
    } else if (!forkDetails?.data?.forkingPeriodEndTimestamp && forkDetails?.data?.tokensInEscrowCount) {
      // 'escrow'
      setForkStatusLabel('Escrow');
      setAddNounsButtonLabel('Add Nouns to escrow');
    } else {
      // 'pre-escrow'
      setForkStatusLabel('Pre-escrow');
      setAddNounsButtonLabel('Add Nouns to Start Escrow Period');
    }
    // match id to upcoming fork id
    if (forks?.data && +id === +forks.data[forks.data.length - 1].id + 1) {
      setIsNewForkPage(true);
    } else {
      setIsNewForkPage(false);
    }

    // threshold
    if ((numTokensInForkEscrow && forkThreshold !== undefined) && numTokensInForkEscrow > forkThreshold) {
      setIsThresholdMet(true);
    } else {
      setIsThresholdMet(false);
    }
    console.log('forkThreshold', forkThreshold, "totalSupply", totalSupply, "numTokensInForkEscrow", numTokensInForkEscrow);
    if (forkThreshold !== undefined && totalSupply && numTokensInForkEscrow) {
      console.log('forkThreshold', forkThreshold, "totalSupply", totalSupply, "numTokensInForkEscrow", numTokensInForkEscrow);
      const percentage = (forkThreshold / totalSupply) * 100;
      const currentPercentage = (numTokensInForkEscrow / forkThreshold) * 100;
      console.log('percentage', percentage, 'currentPercentage', currentPercentage);
      setThresholdPercentage(+percentage.toFixed(2));
      setCurrentEscrowPercentage(+currentPercentage.toFixed(2));
    }
  }, [isModalOpen, isForkPeriodActive, numTokensInForkEscrow, forkDetails, forkThreshold, totalSupply, forks.data, id]);

  // useEffect(() => {
  //   console.log('forkDetails?.data?.joinedNouns', forkDetails?.data?.joinedNouns);
  //   // if (isForkPeriodActive) {
  //   const nouns = forkDetails?.data?.joinedNouns.map((joined) => joined.noun.id) || [];
  //   // setTest(["test"])
  //   // setNounsInFork([1, 2]);
  //   // } else {
  //   // setNounsInFork(forkDetails?.data?.escrowedNouns.map((escrowed) => escrowed.noun.id) || []);
  //   // }
  // }, [forkDetails]);

  // useEffect(() => {
  //   if ((numTokensInForkEscrow && forkThreshold !== undefined) && numTokensInForkEscrow >= forkThreshold) {
  //     setIsThresholdMet(true);
  //   }
  // }, [forkThreshold, numTokensInForkEscrow]);

  // useEffect(() => {
  //   if (forkThreshold !== undefined && totalSupply && numTokensInForkEscrow) {
  //     const percentage = (forkThreshold / totalSupply) * 100;
  //     const currentPercentage = (numTokensInForkEscrow / forkThreshold) * 100;
  //     setThresholdPercentage(+percentage.toFixed(2));
  //     setCurrentEscrowPercentage(+currentPercentage.toFixed(2));
  //   }
  // }, [forkThreshold, totalSupply, numTokensInForkEscrow]);
  // if (+id > +forks.data[forks.data.length - 1].id) {
  //   return false;
  // }

  // if (!forkDetails.data || !totalSupply || !forkThreshold || !numTokensInForkEscrow || !userEscrowedNounIds.data || !userOwnedNounIds.data || !escrowEvents.data || !forks.data) {
  if (!forks.data || !forkDetails.data) {
    return (
      <div className={clsx(classes.spinner, classes.pageLoadingSpinner)}>
        {/* <Spinner animation="border" /> */}
        <img src="/loading-noggles.svg" alt="loading" className={classes.transactionModalSpinner} />
      </div>
    );
  }

  // if (forks.error || forkDetails.error || userEscrowedNounIds.error || userOwnedNounIds.error || escrowEvents.error) {
  //   return <Trans>Failed to fetch</Trans>;
  // }

  if (forks.data && +id > +forks.data[forks.data.length - 1].id + 1) {
    // fork doesn't exist
    return <NotFoundPage />;
  }

  // if (+id === +forks.data[forks.data.length - 1].id + 1) {
  //   // new fork page
  //   setIsNewForkPage(true);
  // }


  return (
    <>
      <Section fullWidth={false} className='h-100'>
        {isNewForkPage ? (
          <div className={clsx(
            classes.pageHeader,
            classes.emptyState,
          )}>
            <Col lg={12}>
              <header>
                <span className={clsx(classes.forkStatus)}>
                  {forkStatusLabel}
                </span>
                <h1><Trans>Fork Nouns DAO</Trans></h1>
                <p className='mb-4'><Trans>short intro about what it means to fork TKTK</Trans></p>
              </header>
              {userOwnedNounIds.data && userOwnedNounIds.data.length > 0 && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className={clsx(classes.button, classes.primaryButton)}
                  disabled={userOwnedNounIds.data.length === 0}
                >
                  {addNounsButtonLabel}
                </button>
              )}
              <p className={classes.note}><Trans>
                {forkThreshold === undefined ? '...' : forkThreshold} Nouns {(`(${thresholdPercentage}%)`) || '...'} are required to meet the fork threshold
              </Trans></p>
            </Col>
          </div>
        ) : (
          <div className={clsx(
            classes.pageHeader,
            (!escrowEvents.data || isNewForkPage) && classes.emptyState,
            isForked && classes.isForked
          )}>
            <Col lg={6}>
              <span className={clsx(classes.forkStatus)}>
                {forkStatusLabel}
              </span>
              <h1><Trans>Nouns DAO Fork{isForked ? ` #${id}` : ''}</Trans></h1>
              {!isForkPeriodActive || !isForked && (
                <p><Trans>
                  {forkThreshold === undefined ? '...' : forkThreshold} Nouns {(`(${thresholdPercentage}%)`) || '...'} are required to meet the threshold
                </Trans></p>
              )}

            </Col>
            {!isForked && (
              <Col lg={6} className={clsx(
                classes.buttons,
                !escrowEvents.data && classes.emptyState
              )}>
                {(!isForkPeriodActive && userEscrowedNounIds && userEscrowedNounIds.data?.length > 0) && (
                  <WithdrawNounsButton
                    tokenIds={userEscrowedNounIds.data}
                    isWithdrawModalOpen={isWithdrawModalOpen}
                    setIsWithdrawModalOpen={setIsWithdrawModalOpen}
                    setDataFetchPollInterval={setDataFetchPollInterval}
                  />
                )}
                {userOwnedNounIds.data && userOwnedNounIds.data.length > 0 && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className={clsx(classes.button, classes.primaryButton)}
                    disabled={userOwnedNounIds.data.length === 0}
                  >
                    {addNounsButtonLabel}
                  </button>
                )}
              </Col>
            )}
          </div>
        )}


      </Section>
      {isForkPeriodActive && forkDetails.data.forkingPeriodEndTimestamp && (
        <Section fullWidth={false}>
          <div className={clsx(classes.countdown, classes.callout)}>
            <ForkingPeriodTimer
              endTime={+forkDetails.data.forkingPeriodEndTimestamp}
              isPeriodEnded={forkDetails?.data?.executed && +forkDetails.data.forkingPeriodEndTimestamp < now.getTime() / 1000 ? true : false}
            />
            <p>
              time left to return Nouns and join this fork.
            </p>
          </div>
        </Section>
      )
      }
      {isForked && (
        <Section fullWidth={false}>
          <div className={clsx(classes.callout, classes.isForked)}>
            {forkDetails.data.forkingPeriodEndTimestamp && (
              <p>
                <Trans><strong>This fork was executed on {dayjs.unix(+forkDetails.data.forkingPeriodEndTimestamp).format('MMM D, YYYY')}</strong></Trans>
              </p>
            )}
            <p>Fork contracts:{" "}
              {/* awaiting data */}
              {/* <a
                  href={buildEtherscanAddressLink(forkDetails.data.TKTK)}
                  target='_blank'
                  rel='noreferrer'
                >
                  Governor
                </a>,{" "} */}
              {forkDetails.data.forkTreasury && (
                <>
                  <a
                    href={buildEtherscanAddressLink(forkDetails.data.forkTreasury)}
                    target='_blank'
                    rel='noreferrer'
                  >
                    Treasury
                  </a>,{" "}
                </>
              )}
              {forkDetails.data.forkToken && (
                <>
                  <a
                    href={buildEtherscanAddressLink(forkDetails.data.forkToken)}
                    target='_blank'
                    rel='noreferrer'
                  >
                    Token
                  </a>,{" "}
                </>
              )}
              {/* awaiting data */}
              {/* <a
                  href={buildEtherscanAddressLink(forkDetails.data.TKTK)}
                  target='_blank'
                  rel='noreferrer'
                >Timelock</a> */}
            </p>
          </div>
        </Section>
      )
      }
      {!isNewForkPage && escrowEvents.data && (
        <div className={clsx(classes.forkTimelineWrapper, isForkPeriodActive && classes.isForkingPeriod, isForked && classes.isForked)}>
          <Container>
            <Row className={classes.forkTimeline}>
              <Col lg={3} className={classes.sidebar}>
                <div className={classes.summary}>
                  <span>
                    {isForkPeriodActive || isForked ? 'in fork' : 'in escrow'}
                  </span>
                  <strong>
                    {isForkPeriodActive || isForked ? <>
                      {forkDetails.data?.tokensForkingCount !== undefined ? forkDetails.data?.tokensForkingCount : '...'}
                    </> : <>
                      {numTokensInForkEscrow !== undefined ? numTokensInForkEscrow : '...'}
                    </>}

                    {" "}Noun{numTokensInForkEscrow === 1 ? '' : 's'}
                  </strong>
                  {!isForkPeriodActive || !isForked && (
                    <span>
                      {currentEscrowPercentage !== undefined && `${currentEscrowPercentage}%`}
                    </span>
                  )}
                </div>

                <DeployForkButton
                  setDataFetchPollInterval={setDataFetchPollInterval}
                  refetchData={refetchForkData}
                  isDeployModalOpen={isDeployModalOpen}
                  setIsDeployModalOpen={setIsDeployModalOpen}
                  isForkPeriodActive={isForkPeriodActive}
                  isThresholdMet={isThresholdMet}
                />

                {isForkPeriodActive || isForked && (
                  <div className={classes.nounsInFork}>
                    {forkDetails.data.addedNouns.map((nounId) => (
                      <a href={`/noun/${nounId}`} target='_blank' rel='noreferrer'><img src={`https://noun.pics/${nounId}`} alt="noun" className={classes.nounImage} /></a>
                    ))}
                    {/* add phantom elements to align boxes */}
                    {phantomListItems.map((i) => (
                      <div className={clsx(classes.nounImage, classes.phantom)} />
                    ))}
                  </div>
                )}
              </Col>
              <Col lg={9} className={classes.events}>
                {!isForked && userEscrowedNounIds.data && userEscrowedNounIds.data.length > 0 && (
                  <div className={clsx(classes.userNouns, classes.callout)}>
                    <p>
                      Your Noun{userEscrowedNounIds.data.length > 1 && 's'} in escrow: <strong>{userEscrowedNounIds.data.map((nounId) => `Noun ${nounId}`).join(', ')}</strong>
                    </p>
                  </div>
                )}
                {/* if forked, add fork event to top of list */}
                {/* {isForked || isForkPeriodActive && (
                  <ForkDeployEvent forkDetails={forkDetails.data} />
                )} */}
                {escrowEvents.data && escrowEvents.data.map((event, i) => <ForkEvent event={event} isOnlyEvent={escrowEvents.data.length > 1 ? false : true} />)}
              </Col>
            </Row>
          </Container>
        </div >
      )
      }
      {
        account && (
          <>
            <AddNounsToForkModal
              setIsModalOpen={setIsModalOpen}
              isModalOpen={isModalOpen}
              isForkingPeriod={isForkPeriodActive}
              title={'Add Nouns to escrow'}
              description={"Nouners can withdraw their tokens from escrow as long as the forking period hasn't started. Nouns in escrow are not eligible to vote or submit proposals."}
              selectLabel={'Select Nouns to escrow'}
              selectDescription={'Add as many or as few of your Nouns as you’d like.  Additional Nouns can be added during the escrow period.'}
              account={account}
              ownedNouns={userOwnedNounIds.data}
              userEscrowedNouns={userEscrowedNounIds.data}
              refetchData={refetchForkData}
              setDataFetchPollInterval={setDataFetchPollInterval}
            />
          </>
        )
      }
    </>
  );
};
export default ForkPage;
