import React, { SyntheticEvent, useEffect, useState } from 'react';
import classNames from 'classnames';
import Image from 'next/image';

import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { faCircle1, faCircle2, faCircle3, faCircle4, faCircle5, faSitemap } from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import SearchTokenList from '@valsedel/components/SearchTokenList';

import logos from './parti-logos';
import partier from './partier.json';

import s from './Valsedel.module.css';


interface Props {
  className?: string;
}

const Valsedel: React.FC<Props> = (props) => {

  const [tokenSearch, setTokenSearch] = useState('');
  const debouncedSearch = useDebouncedValue(tokenSearch, 500);

  const [selectedTokens, setSelectedTokens] = useState([] as SearchResultToken[]);
  const [suggestions, setSuggestions] = useState([] as SearchResultToken[]);

  function unselectToken(uuid: string) {
    setSelectedTokens(
      selectedTokens.filter(token => token.uuid !== uuid)
    );
  }

  function onInputChange(event: SyntheticEvent) {
    setTokenSearch((event.currentTarget as HTMLInputElement).value || '');
  }

  function onSuggestionsFetchRequested() {
    // setSuggestions();
  }

  function onSuggestionsClearRequested() {
    setSuggestions([]);
  }

  function onSuggestionSelected(event: SyntheticEvent, data: { suggestion: SearchResultToken, suggestionIndex: number }) {
    // Clear search
    setTokenSearch('');
    // Add to selected items
    const suggestion = data.suggestion;
    let alreadyAdded;
    // id
    if (suggestion.id) {
      alreadyAdded = selectedTokens.find((token: SearchResultToken) => token.id === suggestion.id);
    }
    // unique & non empty items
    if (!alreadyAdded) {
      selectedTokens.push(suggestion);
    }
    setSelectedTokens(selectedTokens);
  }

  function onTokenListKeyDown(event: SyntheticEvent) {
    if (_removeKeys.has((event.nativeEvent as KeyboardEvent).key)) {
      const uuid = (event.target as HTMLElement).getAttribute('data-uuid');
      if (uuid) {
        unselectToken(uuid);
      }
    }
  }

  function onTokenListRemoveClick(event: SyntheticEvent) {
    if ((event.target as HTMLElement).classList.contains('token-list-item-remove')) {
      const parentEl = (event.target as HTMLElement).parentElement;
      const uuid = parentEl?.getAttribute('data-uuid');
      if (uuid) {
        unselectToken(uuid);
      }
    }
  }

  useEffect(() => {
    setSuggestions(_searchTokens(debouncedSearch));
  }, [debouncedSearch]);

  return (
    <div className={classNames(s.Wrapper, props.className)}>

      <header className={s.Header}>
        <div className="container mx-auto">
          <h1>MIN<span className="text-yellow-300">VALSEDEL</span>.SE</h1>
        </div>
      </header>

      <div className={s.Content}>

        <div
          onKeyDown={onTokenListKeyDown}
          onClick={onTokenListRemoveClick}
        >
          <h2>Mina val till Riksdagen</h2>

          <SearchTokenList
            tokenSearch={tokenSearch}
            tokenItems={selectedTokens}
            suggestions={suggestions}
            inputPlaceholder="Sök parti eller kandidat …"
            getTokenListItemComponent={function() {
              return ChoiceTokenListItem;
            }}
            className={`choices${selectedTokens.length > 2 ? ' choices-full' : ''}`}
            onInputChange={onInputChange}
            onSuggestionsFetchRequested={onSuggestionsFetchRequested}
            onSuggestionsClearRequested={onSuggestionsClearRequested}
            onSuggestionSelected={onSuggestionSelected}
          />

        </div>

        <div>
          <h2>Min valsedel</h2>

          <div className="valsedel-wrapper">
            <div className="valsedel-preview riksdag">

              <div className="bars bars-left" />
              <div className="bars bars-right" />

              <div className="valsedel-top-text">
                VAL TILL RIKSDAGEN
              </div>

              <div className="valsedel-choices">

                {selectedTokens.map(({ choice }, i) => (
                  <div
                    key={i}
                    className="valsedel-choice"
                  >
                    <div className="valsedel-choice-label">
                      {_choiceLabels[i]}
                    </div>
                    <div className="valsedel-choice-party">
                      {logos[choice.id] &&
                        <Image
                          src={logos[choice.id]}
                          alt={`Logotyp för partiet “${choice.name}”`}
                          className="logo"
                        />
                      }
                      {!logos[choice.id] &&
                        <div className="text-2xl font-bold">{choice.name}</div>
                      }
                    </div>
                    {choice.person &&
                      <div className="valsedel-choice-person">
                        <div className="person-check">☑︎</div>
                        <div className="person-nr">{choice.person.nr}</div>
                        <div className="person-name">{choice.person.name}, {choice.person.age}</div>
                        <div className="person-info">{choice.person.info}</div>
                      </div>
                    }
                    <div className="valsedel-choice-district">{choice.region || 'Hela landet'}</div>
                    <div className="valsedel-choice-list-type">
                      <div>{choice.id}</div>
                      <div>XXXXX</div>
                    </div>
                  </div>
                ))}

              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Valsedel;


interface ChoiceTokenListItemProps {
  uuid: string;
  index: number;
  choice: ChoiceToken;
}

/**
 * ChoiceTokenListItem
 */
const ChoiceTokenListItem: React.FC<ChoiceTokenListItemProps> = (props) => {
  const {
    uuid,
    index,
    choice,
  } = props;

  return (
    <div
      tabIndex={0}
      className="search-token-list-item choice"
      data-uuid={uuid}
    >
      <div className="choice-nr">
        <FontAwesomeIcon
          icon={_numberIcons[index]}
        />
      </div>
      <div className="choice-info">
        <div className="choice-name">{choice.name}</div>
        <div className="choice-id">{choice.id}</div>
        <div className="choice-abbr">({choice.abbr})</div>
      </div>
      <button
        type="button"
        title="Remove"
        className="token-list-item-remove choice-remove"
        tabIndex={-1}
      >
        <FontAwesomeIcon
          icon={faTrashAlt}
        />
      </button>
    </div>
  );
};

const _removeKeys = new Set([
  'Backspace',
  'Delete',
]);

const _numberIcons = [
  faCircle1,
  faCircle2,
  faCircle3,
  faCircle4,
  faCircle5,
];

const _choiceLabels = [
  'Förstahandsval',
  'Andrahandsval',
  'Tredjehandsval',
  'Fjärdehandsval',
  'Femtehandsval',
];

interface ChoiceToken {
  name: string;
  id: string;
  abbr: string;
}

interface SearchResultToken {
  uuid: string;
  id: string;
  icon: IconDefinition;
  text: string;
  info: Array<{ text: string }>;
  choice: ChoiceToken;
}

interface Parti {
  forkortning: string;
  partibeteckning: string;
  uuid: string;
  valmyndigheten_id: string;
  valmyndigheten_registreringsdatum: string;
}

/**
 * _searchTokens
 */
function _searchTokens(searchValue: string): SearchResultToken[] {
  const lcSearchValue = searchValue.toLowerCase();
  // Search parties
  const result = partier
    .filter(parti => parti.partibeteckning.toLowerCase().includes(lcSearchValue))
    // map to sortables
    .map(parti => ({
      ...parti,
      searchValueIndex: parti.partibeteckning.toLowerCase().indexOf(lcSearchValue)
    }))
    // sort
    .sort((a, b) => a.searchValueIndex - b.searchValueIndex)
    // map to token results
    .map((parti: Parti) => ({
      uuid: parti.uuid,
      id: parti.valmyndigheten_id,
      icon: faSitemap,
      text: parti.partibeteckning,
      info: [{
        text: `${parti.valmyndigheten_id} (${parti.forkortning})`
      }],
      choice: {
        name: parti.partibeteckning,
        id: parti.valmyndigheten_id,
        abbr: parti.forkortning,
      }
    }));
  // return
  return result;
}

// Hook
function useDebouncedValue(value: any, delay: number) {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(
    () => {
      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent debounced value from updating if value is changed ...
      // .. within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay] // Only re-call effect if value or delay changes
  );
  return debouncedValue;
}
