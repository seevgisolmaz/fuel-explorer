import { WalletConnectConnector } from '@fuels/connectors';
import { FuelProvider } from '@fuels/react';
import { WALLETCONNECT_ID } from 'app-commons';
import { useTheme } from 'next-themes';
import { type ReactNode } from 'react';
import { createConfig } from 'wagmi';
import { CHAINS_TO_CONNECT, TRANSPORTS } from '~portal/systems/Chains';

import { generateETHConnectors } from '~portal/systems/Core/utils/connectors';

type ProvidersProps = {
  children: ReactNode;
};

const ethWagmiConfig = createConfig({
  chains: CHAINS_TO_CONNECT,
  connectors: generateETHConnectors(CHAINS_TO_CONNECT),
  transports: TRANSPORTS,
  ssr: true,
});

export function FuelConnectProvider({ children }: ProvidersProps) {
  const { theme } = useTheme();

  return (
    <FuelProvider
      theme={theme}
      fuelConfig={{
        connectors: [
          new WalletConnectConnector({
            projectId: WALLETCONNECT_ID,
            wagmiConfig: ethWagmiConfig,
          }),
        ],
      }}
    >
      {children}
    </FuelProvider>
  );
}
