import { VersionCheck } from '@/model/version-check';
import {
  AccountState,
  ActionResult,
  ApiAccountData,
  AsyncQuery,
  DBSettings,
  ExternalServiceKeys
} from '@/model/action-result';
import { DBAssetBalance } from '@/model/db-asset-balance';
import { SingleAssetBalance } from '@/model/single-asset-balance';
import { BlockchainAccount } from '@/model/blockchain_account_result';
import { StoredTrade, Trade } from '@/model/stored-trade';
import { Currency } from '@/model/currency';
import { LocationData } from '@/model/location-data';
import { PeriodicClientQueryResult } from '@/model/periodic_client_query_result';
import { NetvalueDataResult } from '@/model/query-netvalue-data-result';
import { Messages } from '@/model/messages';
import {
  AccountSession,
  ApiAssetBalances,
  Blockchain,
  ExternalServiceKey,
  ExternalServiceName,
  FiatExchangeRates,
  SettingsUpdate,
  SyncApproval,
  SyncConflictError,
  TaskResult,
  UnlockPayload,
  Tags,
  Tag,
  AccountData
} from '@/typing/types';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { EthTokens } from '@/model/eth_token';
import { BlockchainAccountPayload } from '@/store/balances/actions';
import { convertAccountData } from '@/utils/conversion';

export class RotkehlchenApi {
  private _axios?: AxiosInstance;

  private get axios(): AxiosInstance {
    if (!this._axios) {
      throw new Error('Axios is not initialized');
    }
    return this._axios;
  }

  private handleResponse<T>(response: AxiosResponse<ActionResult<T>>): T {
    const { result, message } = response.data;
    if (result) {
      return result;
    }
    throw new Error(message);
  }

  connect(port: number): void {
    this._axios = axios.create({
      baseURL: `http://localhost:${port}/api/1/`,
      timeout: 30000
    });
  }

  checkIfLogged(username: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.axios
        .get<ActionResult<AccountSession>>(`/users`) // no need to validate status. Defaults are okay.
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result[username] === 'loggedin');
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  private validate_status_patch_username(status: number) {
    return (
      status == 200 ||
      status == 300 ||
      status == 400 ||
      status == 401 ||
      status == 409
    );
  }

  logout(username: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.axios
        .patch<ActionResult<boolean>>(
          `/users/${username}`,
          {
            action: 'logout'
          },
          { validateStatus: this.validate_status_patch_username }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(true);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  queryPeriodicData(): Promise<PeriodicClientQueryResult> {
    return new Promise<PeriodicClientQueryResult>((resolve, reject) => {
      this.axios
        .get<ActionResult<PeriodicClientQueryResult>>('/periodic/', {
          validateStatus: function(status) {
            return status == 200 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  setPremiumCredentials(
    username: string,
    apiKey: string,
    apiSecret: string
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.axios
        .patch<ActionResult<boolean>>(
          `/users/${username}`,
          {
            premium_api_key: apiKey,
            premium_api_secret: apiSecret
          },
          { validateStatus: this.validate_status_patch_username }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  removeOwnedEthTokens(tokens: string[]): Promise<BlockchainAccount> {
    return new Promise<BlockchainAccount>((resolve, reject) => {
      this.axios
        .delete<ActionResult<BlockchainAccount>>('/blockchains/ETH/tokens', {
          data: {
            eth_tokens: tokens
          },
          validateStatus: function(status) {
            return (
              status == 200 || status == 400 || status == 409 || status == 502
            );
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  addOwnedEthTokens(tokens: string[]): Promise<BlockchainAccount> {
    return new Promise<BlockchainAccount>((resolve, reject) => {
      this.axios
        .put<ActionResult<BlockchainAccount>>(
          '/blockchains/ETH/tokens',
          {
            eth_tokens: tokens
          },
          {
            validateStatus: function(status) {
              return (
                status == 200 || status == 400 || status == 409 || status == 502
              );
            }
          }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  deleteExternalTrade(id: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.axios
        .delete<ActionResult<boolean>>('/trades', {
          data: {
            trade_id: id
          },
          validateStatus: function(status) {
            return status == 200 || status == 400 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  queryExternalTrades(): Promise<StoredTrade[]> {
    return new Promise<StoredTrade[]>((resolve, reject) => {
      this.axios
        .get<ActionResult<StoredTrade[]>>('/trades', {
          params: { location: 'external' },
          validateStatus: function(status) {
            return status == 200 || status == 400 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  ignoredAssets(): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      this.axios
        .get<ActionResult<string[]>>('/assets/ignored', {
          validateStatus: function(status) {
            return status == 200 || status == 400 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  checkVersion(): Promise<VersionCheck> {
    return new Promise<VersionCheck>((resolve, reject) => {
      this.axios
        .get<ActionResult<VersionCheck>>('/version') // no validate status here since defaults work
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  private validate_status_put_settings(status: number) {
    return status == 200 || status == 400 || status == 409;
  }

  setSettings(settings: SettingsUpdate): Promise<DBSettings> {
    return new Promise<DBSettings>((resolve, reject) => {
      this.axios
        .put<ActionResult<DBSettings>>(
          '/settings',
          {
            ...settings
          },
          { validateStatus: this.validate_status_put_settings }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  setMainCurrency(currency: Currency): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.axios
        .put<ActionResult<DBSettings>>(
          '/settings',
          {
            main_currency: currency.ticker_symbol
          },
          { validateStatus: this.validate_status_put_settings }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(true);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  queryExchangeBalancesAsync(
    name: string,
    ignoreCache: boolean = false
  ): Promise<AsyncQuery> {
    return this.axios
      .get<ActionResult<AsyncQuery>>(`/exchanges/balances/${name}`, {
        params: {
          async_query: true,
          ignore_cache: ignoreCache ? true : undefined
        },
        validateStatus: function(status) {
          return status == 200 || status == 400 || status == 409;
        }
      })
      .then(this.handleResponse);
  }

  queryBalancesAsync(): Promise<AsyncQuery> {
    return new Promise<AsyncQuery>((resolve, reject) => {
      this.axios
        .get<ActionResult<AsyncQuery>>('/balances/', {
          params: {
            async_query: true
          },
          validateStatus: function(status) {
            return status == 200 || status == 400 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  queryBlockchainBalancesAsync(
    ignoreCache: boolean = false,
    blockchain?: Blockchain
  ): Promise<AsyncQuery> {
    return new Promise<AsyncQuery>((resolve, reject) => {
      let url = '/balances/blockchains';
      if (blockchain) {
        url += `/${blockchain}`;
      }
      this.axios
        .get<ActionResult<AsyncQuery>>(url, {
          params: {
            async_query: true,
            ignore_cache: ignoreCache ? true : undefined
          },
          validateStatus: function(status) {
            return (
              status == 200 || status == 400 || status == 409 || status == 502
            );
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  queryFiatBalances(): Promise<ApiAssetBalances> {
    return new Promise<ApiAssetBalances>((resolve, reject) => {
      this.axios
        .get<ActionResult<ApiAssetBalances>>('/balances/fiat', {
          validateStatus: function(status) {
            return status == 200 || status == 400 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  queryTaskResult<T>(id: number): Promise<ActionResult<T>> {
    return new Promise<any>((resolve, reject) => {
      this.axios
        .get<ActionResult<TaskResult<ActionResult<T>>>>(`/tasks/${id}`, {
          validateStatus: function(status) {
            return (
              status == 200 || status == 400 || status == 404 || status == 409
            );
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result && result.outcome) {
            resolve(result.outcome);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  queryNetvalueData(): Promise<NetvalueDataResult> {
    return new Promise<NetvalueDataResult>((resolve, reject) => {
      this.axios
        .get<ActionResult<NetvalueDataResult>>('/statistics/netvalue', {
          validateStatus: function(status) {
            return status == 200 || status == 400 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  queryOwnedAssets(): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      this.axios
        .get<ActionResult<string[]>>('/assets', {
          validateStatus: function(status) {
            return status == 200 || status == 400 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  queryTimedBalancesData(
    asset: string,
    start_ts: number,
    end_ts: number
  ): Promise<SingleAssetBalance[]> {
    return new Promise<SingleAssetBalance[]>((resolve, reject) => {
      this.axios
        .get<ActionResult<SingleAssetBalance[]>>(
          `/statistics/balance/${asset}`,
          {
            params: {
              from_timestamp: start_ts,
              to_timestamp: end_ts
            },
            validateStatus: function(status) {
              return status == 200 || status == 400 || status == 409;
            }
          }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  private validate_status_get_statistics_val_distribution(status: number) {
    return status == 200 || status == 400 || status == 409;
  }

  queryLatestLocationValueDistribution(): Promise<LocationData[]> {
    return new Promise<LocationData[]>((resolve, reject) => {
      this.axios
        .get<ActionResult<LocationData[]>>('/statistics/value_distribution', {
          params: { distribution_by: 'location' },
          validateStatus: this.validate_status_get_statistics_val_distribution
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  queryLatestAssetValueDistribution(): Promise<DBAssetBalance[]> {
    return new Promise<DBAssetBalance[]>((resolve, reject) => {
      this.axios
        .get<ActionResult<DBAssetBalance[]>>('/statistics/value_distribution', {
          params: { distribution_by: 'asset' },
          validateStatus: this.validate_status_get_statistics_val_distribution
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  queryStatisticsRenderer(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.axios
        .get<ActionResult<string>>('/statistics/renderer', {
          validateStatus: function(status) {
            return status == 200 || status == 400 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  processTradeHistoryAsync(
    start_ts: number,
    end_ts: number
  ): Promise<AsyncQuery> {
    return new Promise<AsyncQuery>((resolve, reject) => {
      this.axios
        .get<ActionResult<AsyncQuery>>('/history', {
          params: {
            async_query: true,
            from_timestamp: start_ts,
            to_timestamp: end_ts
          },
          validateStatus: function(status) {
            return status == 200 || status == 400 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  setPremiumSync(enabled: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.axios
        .put<ActionResult<DBSettings>>(
          '/settings',
          {
            premium_should_sync: enabled
          },
          { validateStatus: this.validate_status_put_settings }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result.premium_should_sync);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  getFiatExchangeRates(currencies: string[]): Promise<FiatExchangeRates> {
    return new Promise<FiatExchangeRates>((resolve, reject) => {
      this.axios
        .get<ActionResult<FiatExchangeRates>>('/fiat_exchange_rates', {
          params: {
            currencies
          },
          validateStatus: function(status) {
            return status == 200 || status == 400;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  unlockUser(payload: UnlockPayload): Promise<AccountState> {
    const {
      create,
      username,
      password,
      apiKey,
      apiSecret,
      syncApproval
    } = payload;
    if (create) {
      return this.registerUser(username, password, apiKey, apiSecret);
    } else {
      return this.login(username, password, syncApproval);
    }
  }

  registerUser(
    name: string,
    password: string,
    apiKey?: string,
    apiSecret?: string
  ): Promise<AccountState> {
    return new Promise<AccountState>((resolve, reject) => {
      this.axios
        .put<ActionResult<AccountState>>(
          '/users',
          {
            name,
            password,
            premium_api_key: apiKey,
            premium_api_secret: apiSecret
          },
          {
            validateStatus: function(status) {
              return status == 200 || status == 400 || status == 409;
            }
          }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  login(
    name: string,
    password: string,
    syncApproval: SyncApproval = 'unknown'
  ): Promise<AccountState> {
    return new Promise<AccountState>((resolve, reject) => {
      this.axios
        .patch<ActionResult<AccountState>>(
          `/users/${name}`,
          {
            action: 'login',
            password,
            sync_approval: syncApproval
          },
          { validateStatus: this.validate_status_patch_username }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else if (response.status === 300) {
            reject(new SyncConflictError(message));
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  removeExchange(name: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.axios
        .delete<ActionResult<boolean>>('/exchanges', {
          data: {
            name
          },
          validateStatus: function(status) {
            return status == 200 || status == 400 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  getEthTokens(): Promise<EthTokens> {
    return new Promise<EthTokens>((resolve, reject) => {
      this.axios
        .get<ActionResult<EthTokens>>('/blockchains/ETH/tokens', {
          validateStatus: function(status) {
            return status == 200 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  importDataFrom(source: string, filepath: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.axios
        .put<ActionResult<boolean>>(
          '/import',
          {
            source,
            filepath
          },
          {
            validateStatus: function(status) {
              return status == 200 || status == 400 || status == 409;
            }
          }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  removeBlockchainAccount(
    blockchain: string,
    account: string
  ): Promise<AsyncQuery> {
    return this.axios
      .delete<ActionResult<AsyncQuery>>(`/blockchains/${blockchain}`, {
        data: {
          async_query: true,
          accounts: [account]
        },
        validateStatus: function(status) {
          return (
            status == 200 || status == 400 || status == 409 || status == 502
          );
        }
      })
      .then(this.handleResponse);
  }

  addBlockchainAccount(payload: BlockchainAccountPayload): Promise<AsyncQuery> {
    const { blockchain, address, label, tags } = payload;
    return this.axios
      .put<ActionResult<AsyncQuery>>(
        `/blockchains/${blockchain}`,
        {
          async_query: true,
          accounts: [
            {
              address,
              label,
              tags
            }
          ]
        },
        {
          validateStatus: status =>
            status == 200 || status == 400 || status == 409 || status == 502
        }
      )
      .then(this.handleResponse);
  }

  async editBlockchainAccount(
    payload: BlockchainAccountPayload
  ): Promise<AccountData[]> {
    const { blockchain, address, label, tags } = payload;
    return this.axios
      .patch<ActionResult<ApiAccountData[]>>(
        `/blockchains/${blockchain}`,
        {
          accounts: [
            {
              address,
              label,
              tags
            }
          ]
        },
        {
          validateStatus: status =>
            status == 200 || status == 400 || status == 409 || status == 502
        }
      )
      .then(this.handleResponse)
      .then(accounts => accounts.map(convertAccountData));
  }

  setFiatBalance(currency: string, balance: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.axios
        .patch<ActionResult<boolean>>(
          '/balances/fiat',
          {
            balances: {
              [currency]: balance
            }
          },
          {
            validateStatus: function(status) {
              return status == 200 || status == 400 || status == 409;
            }
          }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  setupExchange(
    name: string,
    api_key: string,
    api_secret: string,
    passphrase: string | null
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.axios
        .put<ActionResult<boolean>>(
          '/exchanges',
          {
            name,
            api_key,
            api_secret,
            passphrase
          },
          {
            validateStatus: function(status) {
              return status == 200 || status == 400 || status == 409;
            }
          }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  exportHistoryCSV(directory: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.axios
        .get<ActionResult<boolean>>('/history/export/', {
          params: {
            directory_path: directory
          },
          validateStatus: function(status) {
            return status == 200 || status == 400 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  modifyAsset(add: boolean, asset: string): Promise<string[]> {
    if (add) {
      return this.addIgnoredAsset(asset);
    } else {
      return this.removeIgnoredAsset(asset);
    }
  }

  addIgnoredAsset(asset: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      this.axios
        .put<ActionResult<string[]>>(
          '/assets/ignored',
          {
            assets: [asset]
          },
          {
            validateStatus: function(status) {
              return status == 200 || status == 400 || status == 409;
            }
          }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  removeIgnoredAsset(asset: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      this.axios
        .delete<ActionResult<string[]>>('/assets/ignored', {
          data: {
            assets: [asset]
          },
          validateStatus: function(status) {
            return status == 200 || status == 400 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  addExternalTrade(trade: Trade): Promise<StoredTrade[]> {
    return new Promise<StoredTrade[]>((resolve, reject) => {
      this.axios
        .put<ActionResult<StoredTrade[]>>(
          '/trades',
          {
            ...trade
          },
          {
            validateStatus: function(status) {
              return status == 200 || status == 400 || status == 409;
            }
          }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  editExternalTrade(trade: StoredTrade): Promise<StoredTrade[]> {
    return new Promise<StoredTrade[]>((resolve, reject) => {
      this.axios
        .patch<ActionResult<StoredTrade[]>>(
          '/trades',
          {
            ...trade
          },
          {
            validateStatus: function(status) {
              return status == 200 || status == 400 || status == 409;
            }
          }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  consumeMessages(): Promise<Messages> {
    return new Promise<any>((resolve, reject) => {
      this.axios
        .get<ActionResult<Messages>>('/messages/') // no need to validate status. Defaults are okay.
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  async getSettings(): Promise<DBSettings> {
    return new Promise<DBSettings>((resolve, reject) => {
      this.axios
        .get<ActionResult<DBSettings>>('/settings', {
          validateStatus: function(status) {
            return status == 200 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  async getExchanges(): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      this.axios
        .get<ActionResult<string[]>>('/exchanges', {
          validateStatus: function(status) {
            return status == 200 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  queryExternalServices(): Promise<ExternalServiceKeys> {
    return new Promise<ExternalServiceKeys>((resolve, reject) => {
      this.axios
        .get<ActionResult<ExternalServiceKeys>>('/external_services/', {
          validateStatus: function(status) {
            return status == 200 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  async setExternalServices(
    keys: ExternalServiceKey[]
  ): Promise<ExternalServiceKeys> {
    return new Promise<ExternalServiceKeys>((resolve, reject) => {
      this.axios
        .put<ActionResult<ExternalServiceKeys>>(
          '/external_services/',
          {
            services: keys
          },
          {
            validateStatus: function(status) {
              return status == 200 || status == 400 || status == 409;
            }
          }
        )
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  async deleteExternalServices(
    serviceToDelete: ExternalServiceName
  ): Promise<ExternalServiceKeys> {
    return new Promise<ExternalServiceKeys>((resolve, reject) => {
      this.axios
        .delete<ActionResult<ExternalServiceKeys>>('/external_services/', {
          data: {
            services: [serviceToDelete]
          },
          validateStatus: function(status) {
            return status == 200 || status == 400 || status == 409;
          }
        })
        .then(response => {
          const { result, message } = response.data;
          if (result) {
            resolve(result);
          } else {
            reject(new Error(message));
          }
        })
        .catch(error => reject(error));
    });
  }

  async getTags(): Promise<Tags> {
    return this.axios
      .get<ActionResult<Tags>>('/tags', {
        validateStatus: function(status: number) {
          return status === 200 || status === 409;
        }
      })
      .then(this.handleResponse);
  }

  async addTag(tag: Tag): Promise<Tags> {
    return this.axios
      .put<ActionResult<Tags>>(
        '/tags',
        { ...tag },
        {
          validateStatus: function(status: number) {
            return status === 200 || status === 400 || status === 409;
          }
        }
      )
      .then(this.handleResponse);
  }

  async editTag(tag: Tag): Promise<Tags> {
    return this.axios
      .patch<ActionResult<Tags>>(
        '/tags',
        { ...tag },
        {
          validateStatus: function(status: number) {
            return status === 200 || status === 400 || status === 409;
          }
        }
      )
      .then(this.handleResponse);
  }

  async deleteTag(tagName: string): Promise<Tags> {
    return this.axios
      .delete<ActionResult<Tags>>('/tags', {
        data: {
          name: tagName
        },
        validateStatus: function(status: number) {
          return status === 200 || status === 400 || status === 409;
        }
      })
      .then(this.handleResponse);
  }

  async accounts(blockchain: Blockchain): Promise<AccountData[]> {
    return this.axios
      .get<ActionResult<ApiAccountData[]>>(`/blockchains/${blockchain}`, {
        validateStatus: function(status: number) {
          return status === 200 || status === 409;
        }
      })
      .then(this.handleResponse)
      .then(accounts => accounts.map(convertAccountData));
  }
}

export const api = new RotkehlchenApi();
