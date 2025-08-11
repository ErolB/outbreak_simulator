import random
import math

def probabilistic_round(n):
    probability = n - int(n)
    if random.random() < probability:
        return int(n) + 1
    else:
        return int(n)


class Person:
    def __init__(self):
        self.alive = True
        self.infected = False
        self.immune = False
        self.days_infected = None
        self.transmission_days = []
        self.network = []
    
    def assign_network(self, p_list):
        self.network = p_list
    
    def is_alive(self):
        return self.alive
    
    def is_infected(self):
        return self.infected
    
    def is_immune(self):
        return self.immune
    
    def expose(self, illness_length, r0):
        if self.is_infected() or self.is_immune():
            return
        self.infected = True
        self.days_infected = 0
        self.transmission_days = random.choices(range(1, illness_length), k=probabilistic_round(r0))
    
    def death(self):
        self.alive = False
        self.infected = False

    def recover(self):
        self.infected = False
        self.immune = True
    
    def transmit(self):
        return len([i for i in self.transmission_days if i == self.days_infected])

    def step(self, illness_length, ifr):
        if self.infected:
            self.days_infected += 1
        if self.infected and self.days_infected >= illness_length:
            if random.random() < ifr:
                self.death()
            else:
                self.recover()

class OutBreak:
    def __init__(self, r0, ifr, illness_length, population_size, network_size=20):
        self.population = [Person() for _ in range(population_size)]
        for p in self.population:
            p.assign_network(random.sample(self.population, k=network_size))  # assign random network
        self.ifr = ifr
        self.illness_length = illness_length
        self.r0 = r0
        self.network_size = network_size
    
    def run(self, max_days=365):
        infection_history = {}
        death_history = {}
        immunity_history = {}
        # initial infections
        for p in random.sample(self.population, math.ceil(len(self.population)/500)):
            p.expose(self.illness_length, self.r0)
           #p.days_infected = random.randint(0, self.illness_length) 
        # main loop
        for d in range(max_days):
            living_population = [p for p in self.population if p.is_alive()]
            fatalities = [p for p in self.population if not p.is_alive()]
            immune_population = [p for p in living_population if p.is_immune()]
            infected_population = [p for p in living_population if p.is_infected()]
            # update history
            infection_history[d] = len(infected_population) / len(living_population)
            immunity_history[d] = len(immune_population) / len(living_population)
            death_history[d] = len(fatalities) / len(self.population)
            # check for stability
            if d > 14 and (infection_history[d] == 0) and (infection_history[d-1] == 0):
                break
            # update simulation
            for p in living_population:
                if p.is_infected():
                    n_contacts = p.transmit()
                    contacts = random.sample([c for c in p.network if c.is_alive()], k=n_contacts)
                    for c in contacts:
                        c.expose(self.illness_length, self.r0)
            for p in living_population:
                p.step(self.illness_length, self.ifr)
        return {'infected': infection_history, 'deaths': death_history, 'immune': immunity_history}
    

if __name__ == '__main__':
    outbreak = OutBreak(r0=2, ifr=0, illness_length=2, population_size=2000, network_size=20)
    print(outbreak.run())




    
