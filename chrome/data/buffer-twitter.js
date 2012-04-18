$(function() {
    
    var self = {};
    self.port = PortWrapper(chrome.extension.connect({name: "buffer-twitter"}));

    var css = $('<style>.tweet .actions a{font-size:12px}div.stream-item:not(.open) div.tweet.original-tweet div.stream-item-header ul.actions{width:100%;padding-left:0;background-image:none;text-align:right}div.stream-item:not(.open) div.tweet.original-tweet div.stream-item-header ul.actions li{background-color:#fff}li.buffer-fade-action{display:none}li.buffer-fade-action span{display:none}.original-tweet .stream-item-header li.buffer-fade-action{background-color:transparent!important;display:inline}.original-tweet .stream-item-header li.buffer-fade-action span{background-image:url(https://si0.twimg.com/a/1323713549/t1/img/twitter_web_sprite_bgs.png)!important;background-position:0 -240px!important;background-repeat:repeat-x!important;width:45px!important;display:inline-block!important;position:relative;right:-5px}a.buffer-action.new{text-decoration:none!important}.open .original-tweet .stream-item-header a.buffer-action.new,.expando-profile-popup a.buffer-action.new{display:none}a.buffer-action.new span i{margin-right:0!important;background-image:url(https://buffer-static.s3.amazonaws.com/images/twttr-sprite.png)!important;background-repeat:no-repeat!important;background-position:-5px -5px!important;margin-right:1px!important;width:16px}.in-reply-to a.buffer-action.new span i,.replies-to a.buffer-action.new span i{background-position:-5px -30px!important}.slideshow-tweet a.buffer-action.new span i{background-position:-5px -55px!important}.slideshow-tweet a.buffer-action.new:hover span i{background-color:#fff!important}a.buffer-action.new:hover span b{text-decoration:underline}div#buffer_add_tweet_container{position:fixed!important;width:100%;height:100%;z-index:99999999999}iframe#buffer_iframe{border:0;height:100%;width:100%;position:fixed;z-index:99999999999;top:0;left:0}a.buffer-action.old span i{background:url(http://bufferapp.com/images/buffer_button_icon.png)!important;background-position:0 2px!important;background-repeat:no-repeat!important;opacity:.5!important;margin-left:3px!important;margin-right:0!important}a.buffer-action.old:hover span i{opacity:.8!important}</style>');
	$('head').append(css);

    ;(function bufferTwitter() {
    	var source = "chrome";

    	function fixLinksInTweet(el, buffer_text) {
    		var tweet_obj = $(el).parents('div.tweet').find('div.tweet-text');
    		var tweet_links = tweet_obj.find('a.twitter-timeline-link');
    		for(i=0; i<tweet_links.length; i++) {
    			var link_in_text = $(tweet_links[i]).text();
    			var link_href = $(tweet_links[i]).attr('href');
    			buffer_text = buffer_text.replace(link_in_text, link_href);
    		}
    		return buffer_text;
    	}

    	function fixLinksInNewTweet(el, buffer_text) {
    		var tweet_obj = $(el).parents('div.tweet').find('p.js-tweet-text');
    		var tweet_links = tweet_obj.find('a.twitter-timeline-link');
    		for(i=0; i<tweet_links.length; i++) {
    			var link_in_text = $(tweet_links[i]).text();
    			var link_href = $(tweet_links[i]).attr('href');
    			buffer_text = buffer_text.replace(link_in_text, link_href);
    		}
    		return buffer_text;
    	}

    	function attachClickListener(buffer_action) {
    		$(buffer_action).click(function(e){
    			e.preventDefault();

    			var twitter_username = $(this).parents('div.tweet').attr('data-screen-name');
    			var buffer_url = "";
    			var buffer_text = "RT @"+twitter_username+": "+$(this).parents('div.tweet').find('div.tweet-text').text();
    			// find links in the tweet and replace the expanded t.co links with their short url
    			buffer_text = fixLinksInTweet(this, buffer_text);
		
    			self.port.emit("buffer_click", buffer_text);
		
    		});
    	}

    	function replaceLineBreaks(text) {
    		var original_text = text;
    		var new_text = text.replace('\n', ' ');
    		if(original_text == new_text) return new_text;
    		else return replaceLineBreaks(new_text);
    	}

    	function attachNewClickListener(buffer_action) {
    		$(buffer_action).click(function(e){
    			e.preventDefault();
    			var el = this;
    			var twitter_username = $(el).parents('div.tweet').attr('data-screen-name');
    			var buffer_url = "";
    			var tweet_html = replaceLineBreaks($(el).parents('div.tweet').find('p.js-tweet-text').html());
    			var tweet_text = $('<span>'+tweet_html+'</span>').text();
    			var buffer_text = "RT @"+twitter_username+": "+tweet_text;
    			// find links in the tweet and replace the expanded t.co links with their short url
    			buffer_text = fixLinksInNewTweet(el, buffer_text);
			
    			self.port.emit("buffer_click", buffer_text);
			
    		});
	
    		$(buffer_action).hover(function(e){
    			e.preventDefault();
    			buffer_action.find('i').css('background-color', buffer_action.find('b').css('color'));
    		});
    	}

    	function createBufferAction(tweet_id) {
    		var buffer_action = $('<a href="#" class="buffer-action old" data-tweet-id="'+tweet_id+'" title="Buffer"><span><i></i><b>Buffer</b></span></a>');
    		attachClickListener(buffer_action);
    		return buffer_action;
    	}

    	function createNewBufferAction(tweet_id) {
    		var buffer_action = $('<li><a href="#" class="buffer-action new" data-tweet-id="'+tweet_id+'" title="Buffer"><span><i></i> <b>Buffer</b></span></a></li>');
    		attachNewClickListener(buffer_action);
    		return buffer_action;
    	}

    	function addBufferToActionElement(action_element) {
    		var tweet_id = $(action_element).attr('data-tweet-id');
    		var buffer_action = createBufferAction(tweet_id);
    		$(action_element).append(buffer_action);
    	}

    	function createNewFadeAction() {
    		return $('<li class="buffer-fade-action"><span>&nbsp;</span></li>');
    	}

    	function addBufferToActionList(action_list) {
    		var tweet_id = $(action_list).parents('.tweet').attr('data-item-id');
    		var buffer_action = createNewBufferAction(tweet_id);
    		$(action_list).find('.action-open-container').before(buffer_action);
    		var fade_action = createNewFadeAction();
    		$(action_list).prepend(fade_action);
    		if($(action_list).parents('.tweet').hasClass('permalink-tweet') || $(action_list).parent().hasClass('stream-item-header')) {
    			buffer_action.find('i').css('background-color', buffer_action.find('b').css('color'));
    		}
    	}

    	function addBufferToActionElementToOldTweets(tweets) {
    		for(i=0; i<tweets.length; i++) {
    			addBufferToActionElement(tweets[i]);
    		}
    	}

    	function addBufferToActionElementToNewTweets(tweets) {
    		var action_lists = $(tweets);
    		for(i=0; i<action_lists.length; i++) {
    			addBufferToActionList(action_lists[i]);
    		}
    	}

    	function getOldTweetsToAdjust() {
    		return $('span.tweet-actions:not(:has(a.buffer-action))'); 
    	}

    	function getNewTweetsToAdjust() {
    		return $('div.tweet ul.actions:not(:has(a.buffer-action))');
    	}

    	function checkForTweets() {

    		var old_tweets = getOldTweetsToAdjust();
    		addBufferToActionElementToOldTweets(old_tweets);
	
    		var new_tweets = getNewTweetsToAdjust();
    		addBufferToActionElementToNewTweets(new_tweets);
	
    	}

    	checkForTweets();

    	setTimeout(bufferTwitter, 500);

    }());
    
});