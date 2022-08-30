import React from 'react';
import classNames from 'classnames';

import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { faTimesCircle } from '@fortawesome/pro-light-svg-icons';
import { faTimes } from '@fortawesome/pro-regular-svg-icons';
import { faCheck } from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import Autosuggest from '@valsedel/components/Autosuggest';


interface SearchTokenListProps {
  tokenSearch?: string;
  tokenItems?: any[];
  suggestions?: any[];
  inputPlaceholder?: string;
  className?: string;
  getTokenListItemComponent?: () => any;
  onInputChange: (event: any) => void;
  onSuggestionsFetchRequested: (event: any) => void;
  onSuggestionsClearRequested: (event: any) => void;
  onSuggestionSelected: (event: any) => void;
}

/**
 * SearchTokenList
 */
const SearchTokenList: React.FC<SearchTokenListProps> = (props) => {
  const {
    tokenSearch = '',
    tokenItems = [],
    suggestions = [],
    inputPlaceholder = 'Search …',
    className,
    getTokenListItemComponent,
    onInputChange,
    onSuggestionsFetchRequested,
    onSuggestionsClearRequested,
    onSuggestionSelected
  } = props;

  const TokenListItem = getTokenListItemComponent
    ? getTokenListItemComponent()
    : _defaultGetTokenListItemComponent();

  function renderInputComponent(props) {
    return (
      <input
        {...props}
        className={classNames(
          'w-full search-token-list-input',
          props.className
        )}
      />
    );
  }

  function renderSuggestion({ id, icon, text, info, searchValue }) {
    // If token found
    if (id) {
      searchValue = tokenSearch || '';
      const content = text
        ? text.replace(RegExp(searchValue, 'i'), '<strong>$&</strong>')
        : 'Unknown';
      return (
        <div className="fa-list-item">
          <div className="icon">
            <FontAwesomeIcon
              icon={icon}
            />
          </div>
          <div className="body">
            <span
              dangerouslySetInnerHTML={{ __html: content }}
              className="message"
            />
            {info && (
              <div className="info">
                {info.map(({ icon, text }, i) => (
                  <div
                    key={i}
                    className="fa-div fa-margin"
                  >
                    {icon &&
                      <FontAwesomeIcon icon={icon} />
                    }
                    {text &&
                      <span className="text">{text}</span>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    // No token found
    return (
      <div className="fa-div fa-margin">
        <FontAwesomeIcon icon={icon} />
        <span className="text">{text}</span>
      </div>
    );
  }

  return (
    <div className={classNames('search-token-list', className)}>

      <div className="token-list">
        {tokenItems.map(({ uuid, ...restListItem }, index) => (
          <TokenListItem
            key={uuid}
            uuid={uuid}
            index={index}
            {...restListItem}
          >
            <RemoveTokenButton />
          </TokenListItem>
        ))}
      </div>

      <div className="form-group has-feedback search-token-list-search">

        <Autosuggest
          suggestions={suggestions}
          getSuggestionValue={suggestion => suggestion.toString()}
          renderInputComponent={renderInputComponent}
          renderSuggestion={renderSuggestion}
          shouldRenderSuggestions={value => value && value.length > 0}
          inputProps={{
            name: 'tokenSearch',
            placeholder: inputPlaceholder,
            value: tokenSearch,
            onChange: onInputChange,
          }}
          onSuggestionsFetchRequested={onSuggestionsFetchRequested}
          onSuggestionsClearRequested={onSuggestionsClearRequested}
          onSuggestionSelected={onSuggestionSelected}
        />

        {/* {model.hasFeedback('tokenSearch') &&
          <FAFeedBackIcon
            getFeedbackIcon={() => (
              _getFeedbackIcon(model.getFeedback('tokenSearch'))
            )}
            className="form-control-feedback"
          />
        } */}

      </div>

    </div>
  );
};

export default SearchTokenList;

/**
 * RemoveTokenButton
 */
const RemoveTokenButton: React.FC<{ className?: string }> = (props) => {
  return (
    <div
      {...props}
      className={classNames('token-remove', props.className)}
    >
      <FontAwesomeIcon
        icon={faTimesCircle}
        size="lg"
        title="Remove item from list"
      />
    </div>
  );
};

/**
 * _defaultGetTokenListItemComponent
 */
function _defaultGetTokenListItemComponent() {
  return DefaultTokenListItem;
}

const DefaultTokenListItem: React.FC<{ className?: string }> = (props) => {
  return (
    <div
      {...props}
      className={classNames('fa-list-item search-token-list-item', props.className)}
    />
  );
};

// Feedback icons
const feedbackIconMap = {
  valid: faCheck,
  invalid: faTimes,
  checking: faSpinner,
};

type FeedbackIconKey = keyof typeof feedbackIconMap;

function _getFeedbackIcon(key: FeedbackIconKey) {
  return feedbackIconMap[key];
}
