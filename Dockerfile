FROM ubuntu

RUN apt-get update

# Install Apache2 HTTP server
RUN apt-get install -y apache2

# Install Python, pip and build dependencies
RUN apt-get install -y python python-dev python-pip gcc libgeoip-dev libxml2-dev libxslt-dev

# Enable the mod_rewrite module of Apache2
RUN a2enmod rewrite

# Create the necessary run folder
RUN mkdir /var/run/apache2

# Add local folder to container
ADD . /home/tobs/prosoar.de

# Replace default Apache2 config
RUN rm /etc/apache2/sites-enabled/000-default
RUN ln -s /home/tobs/prosoar.de/config/apache.conf /etc/apache2/sites-enabled/prosoar

# Install Python dependencies
RUN pip install -r /home/tobs/prosoar.de/requirements.txt

# Expose the HTTP port to the outside
EXPOSE 80

# Run the Apache2 server in non-daemon mode
CMD ["/usr/sbin/apache2ctl", "-D", "FOREGROUND"]
